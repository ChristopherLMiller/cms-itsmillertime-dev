'use client';

import {
  Collection,
  OperationKey,
  Permissions,
  PermissionsManager,
} from '@/lib/PermissionsManager';
import { formatString } from '@/utilities/formatString';
import { Button, CheckboxInput, useField } from '@payloadcms/ui';
import './index.scss';

import React from 'react';

export const ClientPermissionsTable = ({ collections }: { collections: Collection[] }) => {
  // setup the field we are using, as well as a state variable to track changes
  const { value, setValue } = useField<Permissions>({
    path: 'permissions',
  });
  const permissionsManager = new PermissionsManager(collections, value);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, checked } = event.target;
    const [collectionSlug, action] = id.split('.');

    permissionsManager.updatePermissionNode(collectionSlug, action as OperationKey, checked);
    setValue(permissionsManager.getPermissions());
  };

  const handleToggle = (event: React.MouseEvent<Element, MouseEvent>) => {
    const id = event.currentTarget.id;
    const [collectionSlug, state] = id.split('.');

    permissionsManager.updatePermissionsAll(collectionSlug, state === 'all-on' ? true : false);
    setValue(permissionsManager.getPermissions());
  };

  return (
    <div className="field-type table">
      <table
        style={{
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: 'var(--style-radius-s)',
        }}
      >
        <thead>
          <tr>
            <th>Collection Name</th>
            {Object.entries(permissionsManager.defaultPermissionNodes)
              .sort()
              .map((action) => {
                return <th key={action[0]}>{formatString(action[0])}</th>;
              })}
            <th>Toggle</th>
          </tr>
        </thead>
        <tbody>
          {permissionsManager
            .getCollections()
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((collection) => {
              const collectionPermissions = permissionsManager.getPermissionsByCollection(
                collection.slug,
              );
              return (
                <tr key={collection.slug}>
                  <td>{collection.label}</td>
                  {collectionPermissions &&
                    Object.entries(collectionPermissions)
                      .sort()
                      .map((action) => {
                        return (
                          <td key={`${collection.slug}-${action[0]}`}>
                            <CheckboxInput
                              onToggle={handleChange}
                              checked={action[1]}
                              id={`${collection.slug}.${action[0]}`}
                            />
                          </td>
                        );
                      })}
                  <th>
                    <Button
                      className="button-many__toggle"
                      onClick={handleToggle}
                      id={`${collection.slug}.all-on`}
                    >
                      Enable
                    </Button>{' '}
                    /{' '}
                    <Button
                      className="button-many__toggle"
                      onClick={handleToggle}
                      id={`${collection.slug}.all-off`}
                    >
                      Disable
                    </Button>
                  </th>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};
