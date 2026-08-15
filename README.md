# Ouvaton

Application personnelle, indépendante de tout autre projet du compte, pour :

1. ajouter plusieurs adresses (dans n'importe quel ordre) ;
2. calculer automatiquement l'ordre de passage le plus rapide ;
3. ouvrir cet itinéraire, dans le bon ordre, directement dans Google Maps.

100% JavaScript, 100% statique : une seule app React (Vite), sans backend — le navigateur appelle directement les services publics de géocodage et de calcul d'itinéraire. **Installable en PWA** (icône sur l'écran d'accueil, se lance en plein écran comme une app native).

## Pourquoi c'est gratuit

Aucune clé API n'est nécessaire, aucun serveur à faire tourner ou à payer :

- **Géocodage** (adresse texte → coordonnées) : [Nominatim](https://nominatim.org/) (OpenStreetMap), appelé directement depuis le navigateur, avec une file d'attente côté client qui respecte sa limite d'1 requête/seconde.
- **Calcul de l'itinéraire optimal** : le service public [OSRM](http://project-osrm.org/) (`router.project-osrm.org`), endpoint `trip`, qui résout le problème du voyageur de commerce (ordre optimal des arrêts) — appelé lui aussi directement depuis le navigateur.
- **Ouverture finale** : un simple lien `https://www.google.com/maps/dir/?api=1&...` — aucune clé Google requise.

Ces services publics sont prévus pour un usage léger et personnel (quelques calculs par mois) ; pas pour un usage intensif ou commercial.

## Installation

```bash
npm install
```

## Lancer en développement

```bash
npm run dev
```

Frontend sur http://localhost:5173.

## Build de production

```bash
npm run build
npm run preview   # pour tester le build localement
```

Le résultat (`client/dist/`) est un dossier 100% statique : n'importe quel hébergeur de fichiers statiques suffit (GitHub Pages, Netlify, Cloudflare Pages...).

## Déploiement sur GitHub Pages (gratuit)

Un workflow GitHub Actions (`.github/workflows/deploy-pages.yml`) build et déploie automatiquement à chaque push sur `main`.

**Étape unique à faire une fois, dans les réglages du repo GitHub :**

1. Sur `github.com/cavalcantilp/ouvaton` → **Settings** → **Pages**.
2. Section **Build and deployment** → **Source** → choisir **GitHub Actions**.

Une fois ce réglage fait, chaque push sur `main` republie automatiquement l'app sur `https://cavalcantilp.github.io/ouvaton/`. Tu peux aussi déclencher un déploiement manuellement depuis l'onglet **Actions** du repo (bouton *Run workflow* sur `Deploy to GitHub Pages`), y compris avant d'avoir mergé sur `main`.

Toujours 0€ : GitHub Pages est gratuit pour un repo public, et l'app elle-même n'utilise aucune clé API.

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

## Installer l'app (PWA)

Une fois l'app ouverte dans le navigateur (en local sur `localhost`, ou sur l'URL GitHub Pages une fois déployée — HTTPS requis en dehors de `localhost`) :

- **Android / Chrome desktop** : bouton "Installer" dans la barre d'adresse, ou menu ⋮ → *Installer Ouvaton*.
- **iPhone / iPad (Safari)** : bouton Partager → *Sur l'écran d'accueil*.

L'app s'ouvre alors comme une app native (sans barre d'adresse), avec son icône. L'interface (HTML/CSS/JS) est mise en cache par un service worker et se recharge instantanément, même hors-ligne ; le géocodage et le calcul d'itinéraire restent des appels réseau (Nominatim/OSRM) donc nécessitent une connexion.

## Structure

```
client/   application React (Vite) — front + appels directs Nominatim/OSRM
.github/workflows/deploy-pages.yml   build + déploiement GitHub Pages
```

## Limites connues

- Le serveur OSRM public démo n'est pas garanti disponible/rapide en continu (usage léger recommandé).
- Google Maps affiche fiablement jusqu'à une dizaine d'étapes intermédiaires via ce type de lien ; au-delà, vérifiez l'affichage après ouverture.
