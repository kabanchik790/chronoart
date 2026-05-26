import { useMemo, useState } from 'react';
import type { OrderFormValues, User } from '../types';

export const initialOrderFormValues: OrderFormValues = {
  mechanism: 'Автоматический',
  case_type: 'Круглый',
  dial: 'Эмалевый',
  strap: 'Кожа',
  engraving: '',
  budget: '',
  notes: '',
  name: '',
  email: '',
  password: '',
};

export type OrderFormErrorMap = Partial<Record<keyof OrderFormValues, string>>;

export function useOrderForm(user: User | null) {
  const [values, setValues] = useState<OrderFormValues>(initialOrderFormValues);
  const [errors, setErrors] = useState<OrderFormErrorMap>({});

  const updateValue = <K extends keyof OrderFormValues>(key: K, value: OrderFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const selectValue = <K extends 'mechanism' | 'case_type' | 'dial' | 'strap'>(
    key: K,
    value: OrderFormValues[K],
  ) => {
    updateValue(key, value);
  };

  const validateFinalStep = () => {
    const nextErrors: OrderFormErrorMap = {};
    const budget = Number.parseInt(values.budget, 10);

    if (values.engraving.trim().length > 50) {
      nextErrors.engraving = 'Не больше 50 символов';
    }

    if (!values.budget || Number.isNaN(budget) || budget <= 0) {
      nextErrors.budget = 'Укажите бюджет';
    }

    if (!user) {
      if (!values.name.trim()) {
        nextErrors.name = 'Укажите имя';
      }
      if (!values.email.trim() || !values.email.includes('@')) {
        nextErrors.email = 'Укажите email';
      }
      if (values.password.length < 6) {
        nextErrors.password = 'Минимум 6 символов';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const payload = useMemo(
    () => ({
      mechanism: values.mechanism,
      case_type: values.case_type,
      dial: values.dial,
      strap: values.strap,
      engraving: values.engraving.trim(),
      budget: Number.parseInt(values.budget, 10),
      notes: values.notes.trim(),
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
    }),
    [values],
  );

  return {
    values,
    errors,
    payload,
    updateValue,
    selectValue,
    validateFinalStep,
  };
}
