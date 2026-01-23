import { Gutter } from '@payloadcms/ui';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { AdminViewServerProps } from 'payload';
import { BGGView } from './view';

export default async function BGG({ initPageResult, params, searchParams }: AdminViewServerProps) {
  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={initPageResult.req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={initPageResult.req.user || undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <header className="list-header">
          <div className="list-header__content">
            <div className="list-header__title-and-actions">
              <h1 className="list-header__title">Board Games</h1>
            </div>
            <div className="list-header__actions"></div>
          </div>
          <div className="list-header__after-header-content">
            <div className="collection-list__sub-header">
              <div className="custom-view-description">Board Game Geek collection</div>
            </div>
          </div>
        </header>
        <BGGView />
      </Gutter>
    </DefaultTemplate>
  );
}
