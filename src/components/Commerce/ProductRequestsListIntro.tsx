'use client';

import React from 'react';
import styles from './ProductRequests.module.css';

export const ProductRequestsListIntro: React.FC = () => {
  return (
    <div className={styles.intro}>
      <p>
        People who asked to be emailed when a gallery photo is listed in the shop. You do not
        need to edit these rows by hand.
      </p>
      <ol>
        <li>Open the image (use Open image in the row).</li>
        <li>On the Store tab, click Sell this image — or Publish if it is already listed.</li>
        <li>
          They get a “now available” email, and this row flips to Notified. Use Cancelled only if
          you will not list the photo.
        </li>
      </ol>
    </div>
  );
};
