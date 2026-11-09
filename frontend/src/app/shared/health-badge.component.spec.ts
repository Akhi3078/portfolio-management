import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Health } from '../core/models';
import { HealthBadgeComponent } from './health-badge.component';

/**
 * The badge carries a business meaning, so the mapping to the design system's
 * semantic variants is pinned, and so is the rule that the text is always
 * rendered - colour alone is not an acceptable signal.
 */
describe('HealthBadgeComponent', () => {
  let fixture: ComponentFixture<HealthBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HealthBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HealthBadgeComponent);
  });

  function render(health: Health): HTMLElement {
    fixture.componentRef.setInput('health', health);
    fixture.detectChanges();

    return fixture.nativeElement.querySelector('span');
  }

  const cases: ReadonlyArray<[Health, string]> = [
    ['Green', 'adp-standard-badge-success'],
    ['Amber', 'adp-standard-badge-warning'],
    ['Red', 'adp-standard-badge-danger'],
  ];

  for (const [health, variant] of cases) {
    it(`renders ${health} as ${variant} with its label visible`, () => {
      const badge = render(health);

      expect(badge.classList).toContain('adp-standard-badge');
      expect(badge.classList).toContain(variant);
      expect(badge.textContent?.trim()).toBe(health);
    });
  }

  it('uses exactly one semantic variant at a time', () => {
    const badge = render('Amber');

    const variants = Array.from(badge.classList).filter((c) =>
      c.startsWith('adp-standard-badge-')
    );

    expect(variants).toEqual(['adp-standard-badge-warning']);
  });
});
