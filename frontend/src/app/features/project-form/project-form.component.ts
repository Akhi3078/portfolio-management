import { Component, computed, effect, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  PROJECT_STATUSES,
  STATUS_LABELS,
  type Project,
  type ProjectStatus,
  type ProjectWriteModel,
} from '../../core/models';
import { PortfolioApiService } from '../../core/portfolio-api.service';
import { ProjectApiService } from '../../core/project-api.service';
import { fieldErrorsFrom, isConflict, messageFrom } from '../../core/problem-details';
import { routeParam } from '../../core/route-inputs';
import { HealthBadgeComponent } from '../../shared/health-badge.component';

/**
 * Cross-field rules, mirroring the two the server enforces beyond single fields.
 *
 * They live on the FormGroup and are reported as group errors rather than written
 * onto the child controls, so there is no risk of a validation loop; the template
 * asks errorFor() which field each one belongs to.
 *
 * ISO date-only strings compare correctly as strings, so no parsing is needed.
 */
function crossFieldRules(group: AbstractControl): ValidationErrors | null {
  const errors: ValidationErrors = {};

  const startDate = group.get('startDate')?.value as string;
  const endDate = group.get('endDate')?.value as string;

  if (startDate && endDate && endDate < startDate) {
    errors['endDateBeforeStart'] = true;
  }

  const status = group.get('status')?.value as ProjectStatus;
  const progress = Number(group.get('progress')?.value ?? 0);

  if (status === 'Completed' && progress !== 100) {
    errors['progressMustBe100'] = true;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/** Client-side messages, worded to match the server's so the two never disagree. */
const MESSAGES: Record<string, string> = {
  'code.required': 'Code is required.',
  'code.pattern': 'Code must be PRJ- followed by exactly 3 digits, for example PRJ-123.',
  'name.required': 'Name is required.',
  'name.minlength': 'Name must be between 3 and 150 characters.',
  'name.maxlength': 'Name must be between 3 and 150 characters.',
  'owner.required': 'Owner is required.',
  'status.required': 'Status is required.',
  'startDate.required': 'Start date is required.',
  'endDate.required': 'End date is required.',
  'budget.required': 'Budget is required.',
  'budget.min': 'Budget must be greater than 0.',
  'actualCost.min': 'Actual cost must be 0 or more.',
  'progress.min': 'Progress must be between 0 and 100.',
  'progress.max': 'Progress must be between 0 and 100.',
};

const GROUP_MESSAGES: Record<string, { field: string; message: string }> = {
  endDateBeforeStart: {
    field: 'endDate',
    message: 'End date must be on or after start date.',
  },
  progressMustBe100: {
    field: 'progress',
    message: 'Progress must be 100 when status is Completed.',
  },
};

type FormState = 'ready' | 'loading' | 'error';

/**
 * Create and edit a project.
 *
 * The client repeats the server's validation for a fast answer, but the server is
 * still the authority: on a 400 the per-field `errors` dictionary is mapped back
 * onto the matching controls, so a rule only the server knows about still appears
 * next to the field that broke it.
 *
 * Health is never an input. It is shown read-only when editing, as a reminder
 * that it is derived, and it is absent from ProjectWriteModel entirely.
 */
@Component({
  selector: 'app-project-form',
  imports: [ReactiveFormsModule, HealthBadgeComponent],
  templateUrl: './project-form.component.html',
  styleUrl: './project-form.component.css',
})
export class ProjectFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly portfolioApi = inject(PortfolioApiService);
  private readonly projectApi = inject(ProjectApiService);
  private readonly router = inject(Router);

  // Exactly one of these is present, depending on which route was matched; the
  // transform turns the other's `undefined` into an empty string.
  /** Present on the create route. */
  readonly portfolioId = input('', { transform: routeParam('') });
  /** Present on the edit route. */
  readonly projectId = input('', { transform: routeParam('') });

  protected readonly statuses = PROJECT_STATUSES;
  protected readonly statusLabels = STATUS_LABELS;

  protected readonly mode = computed<'create' | 'edit'>(() =>
    this.projectId() ? 'edit' : 'create'
  );

  protected readonly state = signal<FormState>('ready');
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);

  /** A non-field failure: a 404, a 409, or the API being unreachable. */
  protected readonly formError = signal('');

  /** Per-field messages returned by the server's 400. */
  protected readonly serverErrors = signal<Record<string, string>>({});

  /** The loaded project, for the read-only health display when editing. */
  protected readonly existing = signal<Project | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      code: ['', [Validators.required, Validators.pattern(/^PRJ-\d{3}$/)]],
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      owner: ['', [Validators.required]],
      status: ['NotStarted' as ProjectStatus, [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      budget: [0, [Validators.required, Validators.min(0.01)]],
      actualCost: [0, [Validators.min(0)]],
      progress: [0, [Validators.min(0), Validators.max(100)]],
    },
    { validators: crossFieldRules }
  );

  constructor() {
    // On the edit route, load the project and fill the form.
    effect(() => {
      const id = this.projectId();

      if (!id) {
        return;
      }

      this.state.set('loading');

      this.projectApi.getProject(Number(id)).subscribe({
        next: (project) => {
          this.existing.set(project);
          this.form.patchValue({
            code: project.code,
            name: project.name,
            owner: project.owner,
            status: project.status,
            startDate: project.startDate,
            endDate: project.endDate,
            budget: project.budget,
            actualCost: project.actualCost,
            progress: project.progress,
          });
          this.state.set('ready');
        },
        error: (error: unknown) => {
          this.loadError.set(messageFrom(error));
          this.state.set('error');
        },
      });
    });
  }

  /** Where Cancel and a successful save return to. */
  private get returnPortfolioId(): string {
    return this.portfolioId() || String(this.existing()?.portfolioId ?? '');
  }

  // ---- Error reporting -----------------------------------------------------

  /**
   * The one message to show under a field, or null.
   *
   * The server's message wins when there is one: it is the authority, and it is
   * the only one that can explain a rule the client does not implement, such as a
   * duplicate code.
   */
  protected errorFor(field: string): string | null {
    const fromServer = this.serverErrors()[field];

    if (fromServer) {
      return fromServer;
    }

    const control = this.form.get(field);

    if (!control || (!control.touched && !this.submitted())) {
      return null;
    }

    for (const key of Object.keys(control.errors ?? {})) {
      const message = MESSAGES[`${field}.${key}`];

      if (message) {
        return message;
      }
    }

    // Cross-field rules are reported on the group; surface them on their field.
    for (const [key, meta] of Object.entries(GROUP_MESSAGES)) {
      if (meta.field === field && this.form.errors?.[key]) {
        return meta.message;
      }
    }

    return null;
  }

  protected hasError(field: string): boolean {
    return this.errorFor(field) !== null;
  }

  /**
   * A server message is about the value that was sent, so it stops being true as
   * soon as the user edits that field.
   */
  protected clearServerError(field: string): void {
    const current = this.serverErrors();

    if (current[field]) {
      const { [field]: _removed, ...rest } = current;
      this.serverErrors.set(rest);
    }
  }

  // ---- Save ----------------------------------------------------------------

  protected save(): void {
    this.submitted.set(true);
    this.formError.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    // Health is absent by construction - there is no field for it to come from.
    const model: ProjectWriteModel = {
      code: value.code.trim(),
      name: value.name.trim(),
      owner: value.owner.trim(),
      status: value.status,
      startDate: value.startDate,
      endDate: value.endDate,
      budget: Number(value.budget),
      actualCost: Number(value.actualCost),
      progress: Number(value.progress),
    };

    this.saving.set(true);
    this.serverErrors.set({});

    const request =
      this.mode() === 'edit'
        ? this.projectApi.updateProject(Number(this.projectId()), model)
        : this.portfolioApi.createProject(Number(this.portfolioId()), model);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.returnToPortfolio();
      },
      error: (error: unknown) => {
        this.saving.set(false);

        const fieldErrors = fieldErrorsFrom(error);

        if (Object.keys(fieldErrors).length > 0) {
          // A 400: the dictionary keys are field names, so each message lands
          // under the control that caused it.
          this.serverErrors.set(fieldErrors);
        } else if (isConflict(error)) {
          // A 409 carries no errors dictionary, but the only uniqueness rule is
          // the project code, so it belongs next to that field rather than in a
          // banner the user has to connect to a control themselves.
          this.serverErrors.set({ code: messageFrom(error) });
        } else {
          // A 404, or the API being unreachable.
          this.formError.set(messageFrom(error));
        }
      },
    });
  }

  protected returnToPortfolio(): void {
    const id = this.returnPortfolioId;

    void this.router.navigate(id ? ['/portfolios', id] : ['/']);
  }
}
