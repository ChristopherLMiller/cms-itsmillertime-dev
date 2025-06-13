'use client';

import { SelectInput, useField } from '@payloadcms/ui';
import { SelectFieldClientComponent } from 'payload';
import { useEffect, useState } from 'react';

interface ClockifyProjectOption {
  label: string;
  value: string;
}

export const ClockifyProjectSelect: SelectFieldClientComponent = (props) => {
  const { field, path } = props;
  const { value, setValue } = useField({ path });
  const [options, setOptions] = useState<ClockifyProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/clockify/projects');

        if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }

        const projects = await response.json();

        const projectOptions: ClockifyProjectOption[] = projects.map((project: any) => ({
          label: `${project?.client?.name || 'NO CLIENT'} - ${project.name}`,
          value: project.id,
        }));

        setOptions(projectOptions);
      } catch (err) {
        console.error(`Error fetching Clockify projects:`, err);
        setError(err instanceof Error ? err.message : 'Failed to fetch Clockify projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="field-type">
        <label className="field-label">{(field.label as string) || 'Clockify Project'}</label>
        <div>Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="field-type">
        <label className="field-label">{(field?.label as string) || 'Clockify Project'}</label>
        <div style={{ color: 'red' }}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="field-type">
      <label className="field-label">{(field?.label as string) || 'Clockify Project'}</label>
      <SelectInput
        name={field.name}
        {...props}
        options={options}
        value={value as string}
        onChange={(selectedOption) => {
          setValue(selectedOption || '');
        }}
      />
    </div>
  );
};
