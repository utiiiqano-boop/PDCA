# Comment vendre PDCA

## Grille tarifaire
| Plan | TND | EUR | USD |
|------|-----|-----|-----|
| 1 mois | 59 | 17 | 19 |
| 6 mois | 299 | 89 | 99 |
| 1 an | 549 | 159 | 179 |

## Générer un code après paiement

### 1 mois TND
SELECT * FROM create_access_code('monthly', 'TND', 'Nom Client', 'email', 'tel');

### 6 mois TND
SELECT * FROM create_access_code('6month', 'TND', 'Nom Client', 'email', 'tel');

### 1 an TND
SELECT * FROM create_access_code('yearly', 'TND', 'Nom Client', 'email', 'tel');

### Idem EUR / USD

## Trial gratuit (prospect)
SELECT * FROM create_access_code('trial', NULL, 'Prospect X', 'email', 'tel');

## Renouvellement
SELECT * FROM create_access_code_renewal('6month', 'TND', 'Nom Company');
