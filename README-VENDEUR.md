# Guide vendeur PDCA

## Générer un code après paiement

### 1 mois TND (59 DT)
SELECT * FROM create_access_code('monthly', 'TND', 'Nom Client', 'email', 'tel');

### 6 mois TND (299 DT)
SELECT * FROM create_access_code('6month', 'TND', 'Nom Client', 'email', 'tel');

### 1 an TND (549 DT)
SELECT * FROM create_access_code('yearly', 'TND', 'Nom Client', 'email', 'tel');

### Idem EUR / USD

## Trial gratuit
SELECT * FROM create_access_code('trial', NULL, 'Prospect', 'email', 'tel');

## Voir tous les codes vendus
SELECT code, customer_name, plan, currency, status, created_at
FROM access_codes
WHERE plan != 'trial'
ORDER BY created_at DESC;

## Voir les abonnements actifs
SELECT name, subscription_status, subscription_plan, subscription_ends_at
FROM companies
WHERE subscription_status = 'active'
ORDER BY subscription_ends_at DESC;

## Renouvellement
SELECT * FROM create_access_code_renewal('6month', 'TND', 'Nom Company');
