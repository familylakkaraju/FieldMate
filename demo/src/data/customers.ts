import type { Customer, HistoryItem, ServiceType } from '../types/domain';
import { addDays } from './demoClock';

/** Deterministic history for recurring window customers: `count` visits every `weeks` weeks ending at `last`. */
function cycle(last: string, weeks: number, price: number, count: number, service: ServiceType = 'window', title = 'Window clean — recurring'): HistoryItem[] {
  return Array.from({ length: count }, (_, i) => ({ date: addDays(last, -i * weeks * 7), service, title, value: price }));
}

const c = (x: Omit<Customer, 'notes'> & { notes?: Customer['notes'] }): Customer => ({ notes: [], ...x });

export const CUSTOMERS: Customer[] = [
  c({
    id: 'cus-thompson', name: 'Graham Thompson', email: 'graham.thompson@example.com', phone: '07700 900211',
    address: '42 Lodge Avenue, Moulsham Lodge', town: 'Chelmsford', postcode: 'CM2 9PX', propertyType: '3-bed semi-detached',
    tags: ['Autumn gutter care'], customerSince: '2023-10-12', source: 'website',
    recurring: [{ service: 'gutter', frequencyWeeks: 52, pricePerVisit: 110, nextDue: '2026-10-09', label: 'Annual autumn gutter clean' }],
    history: [
      { date: '2025-10-14', service: 'gutter', title: 'Gutter clean — front & rear', value: 105 },
      { date: '2024-10-21', service: 'gutter', title: 'Gutter clean — front & rear', value: 95 },
      { date: '2023-10-12', service: 'gutter', title: 'Gutter clean — front & rear', value: 95 },
    ],
  }),
  c({
    id: 'cus-morrison', name: 'Claire Morrison', email: 'claire.morrison@example.com', phone: '07700 900212',
    address: '7 Beech Rise, Galleywood', town: 'Chelmsford', postcode: 'CM2 8RT', propertyType: '4-bed detached with conservatory',
    tags: ['Recurring windows', 'Conservatory'], customerSince: '2024-03-04', source: 'website',
    recurring: [{ service: 'window', frequencyWeeks: 8, pricePerVisit: 28, nextDue: '2026-12-04', label: '8-weekly window clean' }],
    history: [...cycle('2026-08-14', 8, 28, 6), { date: '2025-10-17', service: 'gutter', title: 'Gutter clean — front & rear', value: 120 }],
    notes: [{ id: 'n-mor-1', at: '2026-10-02T11:20', by: 'w-sophie', text: 'Asked for a full clean including the conservatory roof before family visit on the 10th.' }],
  }),
  c({
    id: 'cus-patel', name: 'Raj Patel', email: 'raj.patel@example.com', phone: '07700 900213',
    address: '31 Hamlet Court, Moulsham', town: 'Chelmsford', postcode: 'CM2 0AH', propertyType: '2-bed terrace',
    tags: ['Plumbing'], customerSince: '2025-06-10', source: 'phone',
    history: [{ date: '2025-06-10', service: 'plumbing', title: 'Bathroom basin tap replacement', value: 140 }],
  }),
  c({
    id: 'cus-ellis', name: 'Margaret Ellis', email: 'margaret.ellis@example.com', phone: '07700 900214',
    address: '12 Kings Chase', town: 'Brentwood', postcode: 'CM14 4LD', propertyType: '3-bed semi-detached',
    tags: ['Plumbing', 'Recurring windows'], customerSince: '2022-11-03', source: 'referral',
    recurring: [{ service: 'window', frequencyWeeks: 6, pricePerVisit: 24, nextDue: '2026-10-15', label: '6-weekly window clean' }],
    history: [
      ...cycle('2026-09-03', 6, 24, 5),
      { date: '2026-03-11', service: 'plumbing', title: 'Radiator bleed & balance', value: 90 },
      { date: '2025-11-20', service: 'plumbing', title: 'Leaking stopcock replaced', value: 120 },
    ],
  }),
  c({
    id: 'cus-okafor', name: 'Chidi Okafor', email: 'chidi.okafor@example.com', phone: '07700 900215',
    address: '5 Marconi Gardens', town: 'Chelmsford', postcode: 'CM1 2QE', propertyType: '3-bed terrace',
    tags: ['New customer'], customerSince: '2026-10-06', source: 'website', history: [],
  }),
  c({
    id: 'cus-davies', name: 'Rhian Davies', email: 'rhian.davies@example.com', phone: '07700 900216',
    address: '14 Maple Drive, Great Baddow', town: 'Chelmsford', postcode: 'CM2 7LP', propertyType: '3-bed semi-detached',
    tags: ['Recurring windows', 'Great Baddow round'], customerSince: '2024-05-17', source: 'website',
    recurring: [{ service: 'window', frequencyWeeks: 4, pricePerVisit: 22, nextDue: '2026-11-06', label: '4-weekly window clean' }],
    history: [...cycle('2026-09-11', 4, 22, 8)],
  }),
  c({
    id: 'cus-baker', name: 'Lucy Baker', email: 'lucy.baker@example.com', phone: '07700 900217',
    address: '16 Maple Drive, Great Baddow', town: 'Chelmsford', postcode: 'CM2 7LP', propertyType: '3-bed semi-detached',
    tags: ['Recurring windows', 'Great Baddow round'], customerSince: '2025-02-21', source: 'referral',
    recurring: [{ service: 'window', frequencyWeeks: 4, pricePerVisit: 22, nextDue: '2026-11-06', label: '4-weekly window clean' }],
    history: [...cycle('2026-09-11', 4, 22, 6)],
  }),
  c({
    id: 'cus-walsh', name: 'Karen Walsh', email: 'karen.walsh@example.com', phone: '07700 900218',
    address: '3 Linden Close, Great Baddow', town: 'Chelmsford', postcode: 'CM2 7NJ', propertyType: '4-bed detached',
    tags: ['Recurring windows', 'Great Baddow round'], customerSince: '2024-09-13', source: 'website',
    recurring: [{ service: 'window', frequencyWeeks: 4, pricePerVisit: 24, nextDue: '2026-11-06', label: '4-weekly window clean' }],
    history: [...cycle('2026-09-11', 4, 24, 7)],
  }),
  c({
    id: 'cus-bennett', name: 'Paul Bennett', email: 'paul.bennett@example.com', phone: '07700 900219',
    address: '8 Mill Road', town: 'Maldon', postcode: 'CM9 5HP', propertyType: '4-bed detached',
    tags: ['Autumn gutter care'], customerSince: '2024-10-28', source: 'website',
    recurring: [{ service: 'gutter', frequencyWeeks: 52, pricePerVisit: 120, nextDue: '2026-10-12', label: 'Annual autumn gutter clean' }],
    history: [
      { date: '2025-10-20', service: 'gutter', title: 'Gutter clean — front & rear', value: 120 },
      { date: '2024-10-28', service: 'gutter', title: 'Gutter clean — front & rear', value: 115 },
    ],
  }),
  c({
    id: 'cus-green', name: 'Hannah Green', email: 'hannah.green@example.com', phone: '07700 900220',
    address: '22 Coggeshall Road', town: 'Braintree', postcode: 'CM7 9DB', propertyType: '3-bed semi-detached',
    tags: ['Plumbing'], customerSince: '2026-09-18', source: 'phone', history: [],
  }),
  c({
    id: 'cus-lewis', name: 'Gareth Lewis', email: 'gareth.lewis@example.com', phone: '07700 900221',
    address: '19 Lexden Park', town: 'Colchester', postcode: 'CO3 4BN', propertyType: '4-bed detached',
    tags: ['Recurring windows', 'Plumbing'], customerSince: '2026-09-02', source: 'referral',
    recurring: [{ service: 'window', frequencyWeeks: 6, pricePerVisit: 30, nextDue: '2026-10-14', label: '6-weekly window clean' }],
    history: [{ date: '2026-09-02', service: 'plumbing', title: 'Radiator bleed & valve repair', value: 90 }],
  }),
  c({
    id: 'cus-wright', name: 'Sam Wright', email: 'sam.wright@example.com', phone: '07700 900222',
    address: '6 Ongar Road', town: 'Brentwood', postcode: 'CM15 9AU', propertyType: '3-bed semi-detached',
    tags: ['Recurring windows'], customerSince: '2025-05-06', source: 'website',
    recurring: [{ service: 'window', frequencyWeeks: 6, pricePerVisit: 24, nextDue: '2026-10-13', label: '6-weekly window clean' }],
    history: [...cycle('2026-09-01', 6, 24, 6)],
  }),
  c({
    id: 'cus-hall', name: 'Fiona Hall', email: 'fiona.hall@example.com', phone: '07700 900223',
    address: '27 Rainsford Avenue', town: 'Chelmsford', postcode: 'CM1 2PQ', propertyType: '3-bed semi-detached',
    tags: ['Recurring windows', 'Autumn gutter care'], customerSince: '2024-01-15', source: 'website',
    recurring: [
      { service: 'window', frequencyWeeks: 4, pricePerVisit: 22, nextDue: '2026-10-12', label: '4-weekly window clean' },
      { service: 'gutter', frequencyWeeks: 52, pricePerVisit: 90, nextDue: '2027-10-02', label: 'Annual autumn gutter clean' },
    ],
    history: [...cycle('2026-09-14', 4, 22, 9), { date: '2025-10-30', service: 'gutter', title: 'Gutter clean — front & rear', value: 90 }],
  }),
  c({
    id: 'cus-turner', name: 'Oliver Turner', email: 'oliver.turner@example.com', phone: '07700 900224',
    address: '11 Collingwood Road', town: 'Witham', postcode: 'CM8 2DY', propertyType: '4-bed detached',
    tags: ['Quote pending'], customerSince: '2025-04-17', source: 'website',
    history: [{ date: '2025-04-17', service: 'window', title: 'One-off window clean', value: 45 }],
  }),
  c({
    id: 'cus-murphy', name: 'Sean Murphy', email: 'sean.murphy@example.com', phone: '07700 900225',
    address: '9 Mersea Road', town: 'Colchester', postcode: 'CO2 7QS', propertyType: '4-bed detached with conservatory',
    tags: ['Recurring windows', 'Conservatory'], customerSince: '2023-06-09', source: 'website',
    recurring: [{ service: 'window', frequencyWeeks: 8, pricePerVisit: 30, nextDue: '2026-10-16', label: '8-weekly window clean' }],
    history: [...cycle('2026-08-21', 8, 30, 6), { date: '2025-11-05', service: 'gutter', title: 'Gutter clean — front & rear', value: 125 }],
  }),
  c({
    id: 'cus-roberts', name: 'Emily Roberts', email: 'emily.roberts@example.com', phone: '07700 900226',
    address: '2 Fambridge Road', town: 'Maldon', postcode: 'CM9 6AZ', propertyType: '2-bed terrace',
    tags: ['Recurring windows'], customerSince: '2025-03-14', source: 'website',
    recurring: [{ service: 'window', frequencyWeeks: 4, pricePerVisit: 20, nextDue: '2026-10-14', label: '4-weekly window clean' }],
    history: [...cycle('2026-09-16', 4, 20, 7)],
  }),
  c({
    id: 'cus-evans', name: 'Tom Evans', email: 'tom.evans@example.com', phone: '07700 900227',
    address: '30 Panfield Lane', town: 'Braintree', postcode: 'CM7 5RN', propertyType: '3-bed semi-detached',
    tags: ['Autumn gutter care'], customerSince: '2024-10-23', source: 'phone',
    recurring: [{ service: 'gutter', frequencyWeeks: 52, pricePerVisit: 90, nextDue: '2026-10-20', label: 'Annual autumn gutter clean' }],
    history: [
      { date: '2025-10-23', service: 'gutter', title: 'Gutter clean — front & rear', value: 90 },
      { date: '2024-10-23', service: 'gutter', title: 'Gutter clean — front & rear', value: 85 },
    ],
  }),
  c({
    id: 'cus-nolan', name: 'Peter Nolan', email: 'peter.nolan@example.com', phone: '07700 900228',
    address: '4 Hutton Drive', town: 'Brentwood', postcode: 'CM13 1LP', propertyType: '3-bed detached',
    tags: ['Plumbing'], customerSince: '2026-09-29', source: 'phone', history: [],
  }),
  c({
    id: 'cus-singh', name: 'Arjun Singh', email: 'arjun.singh@example.com', phone: '07700 900229',
    address: '12 Trinity Road', town: 'Chelmsford', postcode: 'CM2 6HS', propertyType: '3-bed semi-detached',
    tags: ['Recurring windows', 'Plumbing'], customerSince: '2025-08-01', source: 'website',
    recurring: [{ service: 'window', frequencyWeeks: 6, pricePerVisit: 24, nextDue: '2026-10-21', label: '6-weekly window clean' }],
    history: [...cycle('2026-09-09', 6, 24, 4)],
  }),
  c({
    id: 'cus-ahmed', name: 'Yasmin Ahmed', email: 'yasmin.ahmed@example.com', phone: '07700 900230',
    address: '41 Cann Hall Road, Leytonstone', town: 'London', postcode: 'E11 3HY', propertyType: 'Victorian terrace',
    tags: ['Plumbing', 'East London'], customerSince: '2026-08-12', source: 'website',
    history: [{ date: '2026-08-12', service: 'plumbing', title: 'Bathroom basin waste replacement', value: 110 }],
  }),
  c({
    id: 'cus-fisher', name: 'James Fisher', email: 'james.fisher@example.com', phone: '07700 900231',
    address: '5 Station Road, Heybridge', town: 'Maldon', postcode: 'CM9 4LQ', propertyType: '3-bed semi-detached',
    tags: ['Plumbing', 'Gutters'], customerSince: '2025-10-01', source: 'website',
    history: [{ date: '2025-10-01', service: 'gutter', title: 'Gutter clean — front & rear', value: 90 }],
  }),
  c({
    id: 'cus-osei', name: 'Kwame Osei', email: 'kwame.osei@example.com', phone: '07700 900232',
    address: '18 Lordship Road, Writtle', town: 'Chelmsford', postcode: 'CM1 3EH', propertyType: '4-bed detached',
    tags: ['Plumbing'], customerSince: '2026-03-20', source: 'referral',
    history: [{ date: '2026-03-20', service: 'plumbing', title: 'Leaking radiator valve', value: 95 }],
  }),
  c({
    id: 'cus-kelly', name: 'Siobhan Kelly', email: 'siobhan.kelly@example.com', phone: '07700 900233',
    address: '33 Weald Road', town: 'Brentwood', postcode: 'CM14 4TH', propertyType: '3-bed semi-detached',
    tags: ['Plumbing', 'Gutters'], customerSince: '2026-10-03', source: 'phone', history: [],
  }),
  c({
    id: 'cus-chen', name: 'Wei Chen', email: 'wei.chen@example.com', phone: '07700 900234',
    address: '7 Notley Road', town: 'Braintree', postcode: 'CM7 1HH', propertyType: '4-bed detached',
    tags: ['Gutters'], customerSince: '2024-11-11', source: 'website',
    history: [{ date: '2024-11-11', service: 'gutter', title: 'Gutter clean — front & rear', value: 120 }],
  }),
];
