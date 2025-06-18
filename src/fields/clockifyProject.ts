import { Field } from 'payload';

export const clockifyProjectField: Field = {
  name: 'clockify_project',
  type: 'text',
  label: 'Clockify Project',
  admin: {
    components: {
      Field: {
        path: '@/components/ClockifyProjectSelect#ClockifyProjectSelect',
      },
    },
    position: 'sidebar',
    description: 'Select a Clockify Project from your workspace',
  },
};
