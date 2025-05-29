import { Payload } from 'payload';
import { ClientPermissionsTable } from './PermissionsTableClient';

export const PermissionsTableServer = async ({ payload }: { payload: Payload }) => {
  const collections = Object.entries(await payload.collections)
    .filter((collection) => !collection[0].includes('payload-'))
    .map((collection) => ({
      slug: collection[1].config.slug,
      label: collection[1].config.labels.plural as string,
    }));
  const globals = Object.entries(await payload.globals.config).map((globalCollection) => ({
    slug: globalCollection[1].slug,
    label: globalCollection[1].label as string,
  }));

  return <ClientPermissionsTable collections={collections} />;
};
