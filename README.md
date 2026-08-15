# Ouvaton

Application personnelle, indépendante de tout autre projet du compte, pour :

1. ajouter plusieurs adresses (dans n'importe quel ordre) ;
2. calculer automatiquement l'ordre de passage le plus rapide ;
3. ouvrir cet itinéraire, dans le bon ordre, directement dans Google Maps.

100% JavaScript : frontend React (Vite), backend Node/Express.

## Pourquoi c'est gratuit

Aucune clé API n'est nécessaire :

- **Géocodage** (adresse texte → coordonnées) : [Nominatim](https://nominatim.org/) (OpenStreetMap), via une petite file d'attente côté serveur qui respecte sa limite d'1 requête/seconde.
- **Calcul de l'itinéraire optimal** : le service public [OSRM](http://project-osrm.org/) (`router.project-osrm.org`), endpoint `trip`, qui résout le problème du voyageur de commerce (ordre optimal des arrêts).
- **Ouverture finale** : un simple lien `https://www.google.com/maps/dir/?api=1&...` — aucune clé Google requise.

Ces services publics sont prévus pour un usage léger et personnel (quelques calculs par mois) ; pas pour un usage intensif ou commercial. Si un jour le volume augmente, il faudra héberger sa propre instance OSRM/Nominatim ou passer à un service payant.

## Installation

```bash
npm install
```

(installe le client et le serveur via les npm workspaces)

## Lancer en développement

```bash
npm run dev
```

- Frontend sur http://localhost:5173 (proxy `/api` vers le serveur)
- Backend sur http://localhost:3001

## Build de production

```bash
npm run build
npm start
```

Le serveur Express sert alors l'app buildée et l'API sur un seul port (3001 par défaut, configurable via `PORT`).

## Utilisation

1. Tapez une adresse (≥ 3 caractères) puis cliquez sur une suggestion pour l'ajouter à la liste.
2. Ajoutez toutes les adresses à visiter, dans n'importe quel ordre.
3. Réglez les options si besoin :
   - *Le départ est la 1ère adresse de la liste* (coché par défaut)
   - *Retour au point de départ* (boucle)
   - *L'arrivée est la dernière adresse de la liste*
4. Cliquez sur **Calculer le meilleur itinéraire**.
5. L'ordre optimisé, la distance et la durée s'affichent, avec le tracé sur une carte.
6. Cliquez sur **Ouvrir dans Google Maps** : Google Maps s'ouvre avec les arrêts déjà dans le bon ordre.

## Structure

```
client/   application React (Vite)
server/   API Express (proxy Nominatim + OSRM)
```

## Limites connues

- Le serveur OSRM public démo n'est pas garanti disponible/rapide en continu (usage léger recommandé).
- Google Maps affiche fiablement jusqu'à une dizaine d'étapes intermédiaires via ce type de lien ; au-delà, vérifiez l'affichage après ouverture.
