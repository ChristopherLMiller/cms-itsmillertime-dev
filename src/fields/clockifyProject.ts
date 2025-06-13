import { Field } from 'payload';

export const clockifyProjectField: Field = {
  name: 'clockify_project',
  type: 'select',
  label: 'Clockify Project',
  options: [],
  admin: {
    components: {
      Field: {
        path: '@/components/ClockifyProjectSelect#ClockifyProjectSelect',
      },
    },
    position: 'sidebar',
    description: 'Select a Clockify Project from your workspace',
  },
  validate: (value: unknown) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return 'Please select a Clockify project';
    }
    return true;
  },
};
