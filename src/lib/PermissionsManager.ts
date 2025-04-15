export interface Collection {
  slug: string;
  label: string;
}

export type OperationKey =
  | 'read'
  | 'create'
  | 'delete'
  | 'update'
  | 'unlock'
  | 'readVersions'
  | 'admin';

export type Operation = {
  [key in OperationKey]: boolean;
};

export type Permissions = {
  [key: string]: Operation;
};

export class PermissionsManager {
  private collections: Collection[];
  private permissions: Permissions;

  public defaultPermissionNodes = {
    create: false,
    read: false,
    update: false,
    delete: false,
    unlock: false,
    readVersions: false,
    admin: false,
  };

  constructor(
    collections: Collection[],
    permissions: Permissions,
    removeOldCollections: boolean = true,
  ) {
    this.collections = collections;
    this.permissions = permissions;

    if (removeOldCollections) {
      this.removeOldCollections();
    }

    this.verifyPermissionNodes();
  }

  /**
   * Removes old collections based on the passed in value
   * @param value - The value used to determine which collections to remove
   * @returns The updated collections array after removal
   */
  public removeOldCollections(): void {
    // Variables to hold the good and bad collections
    const validPermissions: Permissions = {};
    const invalidPermissions: Permissions = {};
    const validSlugs = this.collections.map((collection) => collection.slug);

    // Only keep permissions for collections that exist in the collections array
    Object.keys(this.permissions).forEach((slug) => {
      if (validSlugs.includes(slug)) {
        validPermissions[slug] = this.permissions[slug];
      } else {
        invalidPermissions[slug] = this.permissions[slug];
      }
    });

    if (Object.entries(invalidPermissions).length) {
      console.debug(
        `Removing the following no longer found collection(s): ${Object.keys(invalidPermissions).join(', ')}`,
      );
    }

    // Update our permission nodes with those that are valid
    this.permissions = validPermissions;
  }

  public verifyPermissionNodes() {
    // Iterate the existing permission nodes and fix them

    Object.keys(this.permissions).forEach((node) => {
      // Get the current nodes from the object
      const currentPermissionNodes = this.permissions[node];

      // Spread in the default and the current so that we have a complete object, just in case
      const adjustedNodes = {
        ...this.defaultPermissionNodes,
        ...currentPermissionNodes,
      };

      // Now write that back to the permission
      this.permissions[node] = adjustedNodes;
    });

    // Now see if there are any new collections not present
    const newCollections = this.collections.filter(
      (collection) => !(collection.slug in this.permissions),
    );

    if (newCollections.length) {
      //console.log(newCollections);
      newCollections.forEach((collection) => {
        this.permissions[collection.slug] = this.defaultPermissionNodes;
      });
    }
  }

  public getCollections(): Collection[] {
    return this.collections;
  }

  public getPermissions(): Permissions {
    return this.permissions;
  }

  public getPermissionsByCollection(collection: Collection['slug']): Operation {
    return this.permissions[collection];
  }

  public updatePermissionNode(
    collection: Collection['slug'],
    action: OperationKey,
    state: boolean,
  ) {
    this.permissions[collection][action] = state;
  }

  public updatePermissionsAll(collection: Collection['slug'], state: boolean) {
    this.permissions[collection] = {
      create: state,
      read: state,
      update: state,
      delete: state,
      unlock: state,
      readVersions: state,
      admin: state,
    };
  }
}
