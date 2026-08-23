import { useState } from 'react';

export type FieldSortState<Field extends string> = {
  direction: 'asc' | 'desc';
  field: Field;
};

export const useFieldSortState = <Field extends string>(
  defaultState: FieldSortState<Field>,
) => {
  const [sortState, setSortState] = useState(defaultState);

  return {
    setField(field: Field) {
      setSortState((currentState) => {
        return { ...currentState, field };
      });
    },
    sortState,
    toggleDirection() {
      setSortState((currentState) => {
        return {
          ...currentState,
          direction: currentState.direction === 'asc' ? 'desc' : 'asc',
        };
      });
    },
  };
};
