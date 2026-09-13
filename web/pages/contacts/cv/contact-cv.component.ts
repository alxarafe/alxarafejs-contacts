import { DecimalPipe } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  InjectionToken,
  Injectable,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { CvPayload, Experience, Titulation } from '../../../models/contact';

export const CV_MAX_GRADE = new InjectionToken<number>('contact-cv: nota máxima por titulación', {
  factory: () => 10,
});
export const CV_MAX_LEVEL = new InjectionToken<number>('contact-cv: nivel máximo por experiencia', {
  factory: () => 5,
});
const COURSE_YEAR_MAX = 2200;

@Injectable()
export class CvStatsService {
  /** Media de los valores presentes, ignorando nulos/vacíos. null si no hay datos. */
  average(values: (number | null)[]): number | null {
    const present = values.filter((v): v is number => v != null && !Number.isNaN(v));
    return present.length === 0 ? null : present.reduce((sum, v) => sum + v, 0) / present.length;
  }
}

function yearsOrderValidator(group: AbstractControl): ValidationErrors | null {
  const from = (group.get('yearFrom')?.value as number | null) ?? null;
  const to = (group.get('yearTo')?.value as number | null) ?? null;
  return from == null || to == null || to >= from ? null : { yearsOrder: true };
}

const EMPTY_TITULATION: Titulation = { id: 0, title: '', institution: null, year: null, grade: null };
const EMPTY_EXPERIENCE: Experience = { id: 0, role: '', company: null, yearFrom: null, yearTo: null, level: null };

// Example of a self-contained, complex form inside a module: reactive
// FormArrays (one per CV section) rebuilt when the target contact changes,
// live averages via computed() + toSignal(valueChanges), a component-scoped
// provider (CvStatsService) and InjectionTokens configured with useValue.
@Component({
  selector: 'contact-cv',
  imports: [ReactiveFormsModule, DecimalPipe],
  providers: [
    CvStatsService,
    { provide: CV_MAX_GRADE, useValue: 10 },
    { provide: CV_MAX_LEVEL, useValue: 5 },
  ],
  templateUrl: './contact-cv.component.html',
  styleUrl: './contact-cv.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactCvComponent {
  private readonly fb = inject(FormBuilder);
  private readonly stats = inject(CvStatsService);
  readonly maxGrade = inject(CV_MAX_GRADE);
  readonly maxLevel = inject(CV_MAX_LEVEL);

  readonly contactId = input(0);
  readonly titulations = input<Titulation[]>([]);
  readonly experiences = input<Experience[]>([]);
  readonly saving = input(false);
  readonly saved = output<CvPayload>();
  readonly cancelled = output<void>();

  readonly form = signal<FormGroup | null>(null);

  readonly titulationRows = computed<AbstractControl[]>(() => this.titulationArray()?.controls ?? []);
  readonly experienceRows = computed<AbstractControl[]>(() => this.experienceArray()?.controls ?? []);

  private readonly cvValue = computed(() => {
    const f = this.form();
    return f ? toSignal(f.valueChanges, { initialValue: f.value }) : null;
  });

  readonly titulationAverage = computed(() => {
    const rows = this.cvValue()?.().titulations as { grade: number | null }[] | undefined;
    return this.stats.average(rows?.map((r) => r.grade) ?? []);
  });

  readonly experienceAverage = computed(() => {
    const rows = this.cvValue()?.().experiences as { level: number | null }[] | undefined;
    return this.stats.average(rows?.map((r) => r.level) ?? []);
  });

  constructor() {
    effect(() => {
      this.contactId();
      const titulations = this.titulations();
      const experiences = this.experiences();
      const next = this.buildForm(titulations, experiences);
      this.form.set(next);
    });
  }

  addTitulation(): void {
    this.titulationArray()?.push(this.buildTitulationRow(EMPTY_TITULATION));
  }

  removeTitulation(index: number): void {
    this.removeAt(this.titulationArray(), index);
  }

  addExperience(): void {
    this.experienceArray()?.push(this.buildExperienceRow(EMPTY_EXPERIENCE));
  }

  removeExperience(index: number): void {
    this.removeAt(this.experienceArray(), index);
  }

  save(): void {
    const f = this.form();
    if (!f) {
      return;
    }
    f.markAllAsTouched();
    if (f.invalid) {
      return;
    }
    this.saved.emit(this.toPayload());
  }

  cancel(): void {
    this.cancelled.emit();
  }

  private titulationArray(): FormArray | null {
    return this.groupArray('titulations');
  }

  private experienceArray(): FormArray | null {
    return this.groupArray('experiences');
  }

  private groupArray(name: string): FormArray | null {
    const control = this.form()?.get(name);
    return control instanceof FormArray ? control : null;
  }

  private removeAt(array: FormArray | null, index: number): void {
    if (array && array.length > 1) {
      array.removeAt(index);
    }
  }

  private buildForm(titulations: Titulation[], experiences: Experience[]): FormGroup {
    return this.fb.group({
      titulations: this.fb.array(titulations.map((t) => this.buildTitulationRow(t))),
      experiences: this.fb.array(experiences.map((e) => this.buildExperienceRow(e))),
    });
  }

  private buildTitulationRow(t: Titulation): FormGroup {
    return this.fb.group({
      title: [t.title, Validators.required],
      institution: [t.institution, Validators.maxLength(255)],
      year: [t.year, [Validators.min(1900), Validators.max(COURSE_YEAR_MAX)]],
      grade: [t.grade, [Validators.min(0), Validators.max(this.maxGrade)]],
    });
  }

  private buildExperienceRow(e: Experience): FormGroup {
    return this.fb.group(
      {
        role: [e.role, Validators.required],
        company: [e.company, Validators.maxLength(255)],
        yearFrom: [e.yearFrom, [Validators.min(1900), Validators.max(COURSE_YEAR_MAX)]],
        yearTo: [e.yearTo, [Validators.min(1900), Validators.max(COURSE_YEAR_MAX)]],
        level: [e.level, [Validators.min(1), Validators.max(this.maxLevel)]],
      },
      { validators: yearsOrderValidator },
    );
  }

  private toPayload(): CvPayload {
    return {
      titulations: this.titulationRows().map((row) => ({
        title: String(row.get('title')?.value ?? '').trim(),
        institution: (row.get('institution')?.value as string | null) ?? null,
        year: (row.get('year')?.value as number | null) ?? null,
        grade: (row.get('grade')?.value as number | null) ?? null,
      })),
      experiences: this.experienceRows().map((row) => ({
        role: String(row.get('role')?.value ?? '').trim(),
        company: (row.get('company')?.value as string | null) ?? null,
        yearFrom: (row.get('yearFrom')?.value as number | null) ?? null,
        yearTo: (row.get('yearTo')?.value as number | null) ?? null,
        level: (row.get('level')?.value as number | null) ?? null,
      })),
    };
  }
}