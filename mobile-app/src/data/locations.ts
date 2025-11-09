import { StoreLocation } from '../types';

export const STORE_LOCATIONS: StoreLocation[] = [
  {
    id: 'loc-1',
    name: 'Cofi Downtown',
    address: '123 Main Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    phone: '(415) 555-0100',
    hours: 'Mon-Fri: 6am-8pm, Sat-Sun: 7am-7pm',
    distance: 0.5,
  },
  {
    id: 'loc-2',
    name: 'Cofi Union Square',
    address: '456 Market Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94103',
    phone: '(415) 555-0200',
    hours: 'Mon-Fri: 5:30am-9pm, Sat-Sun: 6am-8pm',
    distance: 1.2,
  },
  {
    id: 'loc-3',
    name: 'Cofi Financial District',
    address: '789 Montgomery Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94104',
    phone: '(415) 555-0300',
    hours: 'Mon-Fri: 6am-7pm, Sat-Sun: Closed',
    distance: 1.8,
  },
  {
    id: 'loc-4',
    name: 'Cofi Mission Bay',
    address: '321 Mission Bay Blvd',
    city: 'San Francisco',
    state: 'CA',
    zip: '94158',
    phone: '(415) 555-0400',
    hours: 'Mon-Sun: 6am-8pm',
    distance: 2.3,
  },
  {
    id: 'loc-5',
    name: 'Cofi Nob Hill',
    address: '555 California Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94108',
    phone: '(415) 555-0500',
    hours: 'Mon-Fri: 6:30am-7:30pm, Sat-Sun: 7am-6pm',
    distance: 2.7,
  },
];

export const getLocationById = (id: string): StoreLocation | undefined => {
  return STORE_LOCATIONS.find((location) => location.id === id);
};

export const getLocationsByCity = (city: string): StoreLocation[] => {
  return STORE_LOCATIONS.filter(
    (location) => location.city.toLowerCase() === city.toLowerCase()
  );
};

export const getNearestLocations = (limit: number = 5): StoreLocation[] => {
  return STORE_LOCATIONS.slice(0, limit);
};
