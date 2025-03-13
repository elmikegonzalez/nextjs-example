import React from 'react';

import Profile from './user-profile';
import PersonalizedRewardsLink from './personalized-rewards-link';

interface NavLink {
  title: string;
  href: string;
}

interface NavbarProps {
  navLinks: NavLink[];
}

function Navbar({ navLinks }: NavbarProps) {
  return (
      <header className='sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='container h-14 flex items-center justify-between'>
          <nav className='flex items-center'>
            <p className='font-bold mr-6'>Personalize Demo</p>
            <ul className='flex space-x-6 text-sm font-medium text-muted-foreground'>
              {/*{navLinks.map(({ title, href }) => (*/}
              {/*    <a className='hover:text-foreground transition-all' key={title} href={href}>{title}</a>*/}
              {/*))}*/}
              {/* Add the personalized rewards link */}
              <PersonalizedRewardsLink />
            </ul>
          </nav>
          <Profile />
        </div>
      </header>
  );
}

export default Navbar;