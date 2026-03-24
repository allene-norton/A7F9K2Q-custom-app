export const CUSTOMER_SELECTION_FIELD_ID =
  'd82819f0-eaad-45d2-8c67-af1aa08a5949';

export const APPROVAL_NEEDED_FIELD_ID = 'cad5546f-2c00-40b2-98f0-142efd801b0b';

export const COMMERCIAL_SPACE_ID = '26324040';
export const HOURLY_SPACE_ID = '32286697';

export const CUSTOMER_SELECTION_OPTIONS = [
  {
    id: 'c9126535-c0b1-40a1-88fb-e5a350408377',
    name: 'Yes, please complete work.',
    color: '#2ecd6f',
    orderindex: 0,
    clickupStatus: 'in progress',
  },
  {
    id: 'b48319bd-08f9-4e45-b544-997cb4968e06',
    name: 'No, I do not want this completed.',
    color: '#e50000',
    orderindex: 1,
    clickupStatus: 'declined by owner',
  },
  {
    id: '403dbc6c-9201-4f05-ba32-7021c62512ab',
    name: 'I would like this item quoted.',
    color: '#f9d900',
    orderindex: 2,
    clickupStatus: 'needs quote',
  },
  {
    id: '21a48f53-1986-4776-83ec-34446966a3ae',
    name: 'Maybe, I need more information.',
    color: '#04A9F4',
    orderindex: 3,
    clickupStatus: 'maybe - more info',
  },
  {
    id: 'd90834a2-5604-4727-8e5d-6472f231a41d',
    name: 'Not now, keep open — follow up in 6 months',
    color: '#b6b6ff',
    orderindex: 4,
    clickupStatus: 'not now - keep open',
  },
];
