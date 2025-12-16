'use client';

import { SidebarBadgeProvider } from 'payload-sidebar-plugin/components';
import { useEffect, useState } from 'react';

export function NavBadgeProvider({ children }: { children: React.ReactNode }) {
  const [activeJobsCount, setActiveJobsCount] = useState(0);

  useEffect(() => {
    const fetchActiveJobs = async () => {
      try {
        const response = await fetch('/api/nav/jobs');
        if (response.ok) {
          const data = await response.json();
          setActiveJobsCount(data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching active jobs:', error);
      }
    };

    fetchActiveJobs();
  }, []);

  const badges = {
    'payload-jobs': { count: activeJobsCount, color: 'yellow' as const },
  };

  return <SidebarBadgeProvider badges={badges}>{children}</SidebarBadgeProvider>;
}

export default NavBadgeProvider;
