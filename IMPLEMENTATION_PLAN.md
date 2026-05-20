# Plan D'implementation - Client Git Desktop Multiplateforme

## Objectif

Creer un client Git desktop multiplateforme moderne, construit avec :

- Tauri 2
- React + TypeScript
- Tailwind CSS + shadcn/ui
- Backend Rust
- SQLite local
- Git CLI pour le MVP
- libgit2 plus tard si necessaire
- Monaco Editor pour diff/code
- React Flow pour le graphe Git au MVP

Le but est de livrer d'abord un MVP fiable, simple et utilisable, puis d'ajouter progressivement les fonctionnalites avancees.

## Principes Techniques

- Le frontend React gere l'interface, les interactions utilisateur et l'etat visuel.
- Le backend Rust gere les acces systeme, les appels Git, le parsing et SQLite.
- Git reste la source de verite.
- SQLite sert uniquement au cache local, aux preferences et a l'historique applicatif.
- Le MVP utilise le binaire `git` installe sur la machine.
- `libgit2` ne doit pas etre utilise au debut.
- Le graphe Git commence avec React Flow, puis peut migrer vers Canvas/WebGL si necessaire.
- Les commandes Git doivent toujours etre executees avec un `cwd` explicite correspondant au depot ouvert.
- Les chemins de fichiers doivent etre traites avec prudence pour eviter les problemes d'espaces, d'encodage ou d'injection.

## Perimetre MVP

Le MVP doit permettre de :

1. Ouvrir un depot Git local.
2. Verifier que le dossier selectionne est bien un depot Git.
3. Afficher la branche courante.
4. Afficher l'etat du depot.
5. Lister les fichiers modifies, staged, untracked, deleted et conflicted.
6. Afficher le diff d'un fichier.
7. Stage un fichier.
8. Unstage un fichier.
9. Discard les changements d'un fichier, avec confirmation.
10. Ecrire un message de commit.
11. Creer un commit.
12. Afficher un historique simple des commits.
13. Afficher un graphe Git basique.
14. Persister les depots recents localement.

## Stack Initiale

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Zustand ou TanStack Store pour l'etat client si necessaire
- Monaco Editor pour le diff
- React Flow pour le graphe Git

### Backend

- Tauri 2
- Rust
- `std::process::Command` pour appeler Git
- SQLite via `sqlx` ou `rusqlite`
- `serde` pour les DTO entre Rust et TypeScript

## Structure De Projet Recommandee

```txt
src/
  app/
    App.tsx
    routes.tsx
  components/
    layout/
    ui/
  features/
    repository/
      RepositoryPicker.tsx
      repository.store.ts
      repository.types.ts
    status/
      StatusPanel.tsx
      FileStatusList.tsx
      status.types.ts
    diff/
      DiffViewer.tsx
      diff.types.ts
    commit/
      CommitPanel.tsx
    history/
      HistoryPanel.tsx
      history.types.ts
    graph/
      GitGraph.tsx
  lib/
    tauri.ts
    paths.ts
    format.ts

src-tauri/
  src/
    main.rs
    commands/
      mod.rs
      repository.rs
      status.rs
      diff.rs
      staging.rs
      commit.rs
      history.rs
      branches.rs
    git/
      mod.rs
      cli.rs
      parsers.rs
      types.rs
    db/
      mod.rs
      connection.rs
      repositories.rs
    errors.rs
```

## Phase 1 - Bootstrap Projet

### Objectif

Creer une base Tauri + React + TypeScript propre.

### Taches

1. Initialiser un projet Tauri 2 avec template React TypeScript.
2. Verifier que l'application demarre en developpement.
3. Ajouter Tailwind CSS.
4. Ajouter shadcn/ui.
5. Mettre en place une page principale vide.
6. Creer un layout desktop minimal : sidebar gauche, panneau principal, panneau bas ou lateral pour commit/diff, barre superieure avec nom du repo et branche courante.

### Resultat attendu

Une app desktop demarre avec une interface vide mais structuree.

## Phase 2 - Backend Git CLI

### Objectif

Creer une couche Rust stable pour executer Git.

### Fichiers principaux

- `src-tauri/src/git/cli.rs`
- `src-tauri/src/git/types.rs`
- `src-tauri/src/errors.rs`

### API interne recommandee

```rust
pub struct GitCommand {
    pub repo_path: PathBuf,
}

impl GitCommand {
    pub fn run(&self, args: &[&str]) -> Result<String, AppError>;
}
```

### Contraintes

- Toujours executer Git avec `current_dir(repo_path)`.
- Capturer `stdout`, `stderr` et `exit_code`.
- Transformer les erreurs Git en erreurs applicatives lisibles.
- Ne jamais concatener une commande shell en string.
- Passer les arguments sous forme de tableau.
- Utiliser `--` avant les chemins de fichiers quand necessaire.

### Resultat attendu

Une couche backend permettant d'executer des commandes Git sans dupliquer la logique partout.

## Phase 3 - Ouverture D'un Depot

### Objectif

Permettre a l'utilisateur de selectionner un dossier local et verifier qu'il s'agit d'un depot Git.

### Commandes Tauri

```rust
#[tauri::command]
pub async fn validate_repository(path: String) -> Result<RepositoryInfo, AppError>
```

### Commandes Git utiles

```bash
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git rev-parse --is-inside-work-tree
```

### DTO recommande

```ts
type RepositoryInfo = {
  path: string
  rootPath: string
  name: string
  currentBranch: string | null
}
```

### UI

- Ajouter un bouton `Open Repository`.
- Utiliser le file picker Tauri pour selectionner un dossier.
- Afficher le nom du depot et la branche courante.
- Afficher un etat vide si aucun depot n'est ouvert.

### Resultat attendu

L'application peut ouvrir un depot Git local et afficher ses informations de base.

## Phase 4 - Status Git

### Objectif

Afficher les fichiers modifies du depot.

### Commande Tauri

```rust
#[tauri::command]
pub async fn get_status(repo_path: String) -> Result<GitStatus, AppError>
```

### Commande Git

```bash
git status --porcelain=v2 --branch
```

### Donnees a parser

- Branche courante
- Upstream si disponible
- Ahead / behind si disponible
- Fichiers modified
- Fichiers added
- Fichiers deleted
- Fichiers renamed
- Fichiers untracked
- Fichiers conflicted

### DTO recommande

```ts
type GitStatus = {
  branch: string | null
  upstream: string | null
  ahead: number
  behind: number
  files: GitFileStatus[]
}

type GitFileStatus = {
  path: string
  originalPath?: string
  indexStatus: string
  worktreeStatus: string
  kind:
    | 'modified'
    | 'added'
    | 'deleted'
    | 'renamed'
    | 'untracked'
    | 'conflicted'
}
```

### UI

- Afficher une liste des fichiers.
- Separer visuellement staged, unstaged et untracked.
- Afficher une icone ou couleur par type de changement.
- Ajouter un bouton refresh.

### Resultat attendu

L'utilisateur voit clairement l'etat du depot.

## Phase 5 - Diff

### Objectif

Afficher le diff d'un fichier selectionne.

### Commande Tauri

```rust
#[tauri::command]
pub async fn get_file_diff(
  repo_path: String,
  file_path: String,
  staged: bool
) -> Result<FileDiff, AppError>
```

### Commandes Git

Pour diff unstaged :

```bash
git diff -- path/to/file
```

Pour diff staged :

```bash
git diff --cached -- path/to/file
```

Pour fichier untracked :

```bash
git diff --no-index /dev/null path/to/file
```

Note : `/dev/null` doit etre traite differemment sur Windows. Une alternative MVP est d'afficher le contenu brut du fichier untracked au lieu d'un vrai diff.

### DTO recommande

```ts
type FileDiff = {
  path: string
  staged: boolean
  diff: string
}
```

### UI

- Cliquer sur un fichier affiche son diff.
- Au debut, afficher le diff en texte brut.
- Ensuite integrer Monaco Editor.
- Prevoir une distinction staged/unstaged.

### Resultat attendu

L'utilisateur peut inspecter les modifications d'un fichier.

## Phase 6 - Staging

### Objectif

Permettre de stage et unstage des fichiers.

### Commandes Tauri

```rust
#[tauri::command]
pub async fn stage_file(repo_path: String, file_path: String) -> Result<(), AppError>

#[tauri::command]
pub async fn unstage_file(repo_path: String, file_path: String) -> Result<(), AppError>
```

### Commandes Git

```bash
git add -- path/to/file
git restore --staged -- path/to/file
```

### UI

- Bouton stage par fichier.
- Bouton unstage par fichier.
- Bouton stage all.
- Bouton unstage all.
- Refresh automatique du status apres action.

### Resultat attendu

L'utilisateur peut preparer un commit depuis l'interface.

## Phase 7 - Commit

### Objectif

Creer un commit depuis l'interface.

### Commande Tauri

```rust
#[tauri::command]
pub async fn create_commit(
  repo_path: String,
  message: String
) -> Result<CommitResult, AppError>
```

### Commande Git

```bash
git commit -m "message"
```

### Contraintes

- Ne pas autoriser un message vide.
- Afficher une erreur claire si rien n'est staged.
- Respecter la config Git utilisateur.
- Ne pas gerer les hooks manuellement, laisser Git les executer.

### DTO recommande

```ts
type CommitResult = {
  commitHash: string | null
  summary: string
}
```

### UI

- Textarea de message de commit.
- Bouton commit desactive si message vide.
- Message de succes apres commit.
- Refresh du status et de l'historique apres commit.

### Resultat attendu

L'utilisateur peut creer un commit local.

## Phase 8 - Historique Git

### Objectif

Afficher les commits recents.

### Commande Tauri

```rust
#[tauri::command]
pub async fn get_commit_history(
  repo_path: String,
  limit: Option<u32>
) -> Result<Vec<CommitSummary>, AppError>
```

### Commande Git

```bash
git log --date=iso --pretty=format:%H%x1f%h%x1f%an%x1f%ae%x1f%ad%x1f%s%x1e -n 100
```

### DTO recommande

```ts
type CommitSummary = {
  hash: string
  shortHash: string
  authorName: string
  authorEmail: string
  date: string
  subject: string
}
```

### UI

- Liste des commits recents.
- Afficher hash court, auteur, date et message.
- Cliquer sur un commit pourra plus tard afficher le detail.

### Resultat attendu

L'utilisateur peut consulter l'historique recent.

## Phase 9 - Graphe Git Basique

### Objectif

Afficher une premiere visualisation du graphe Git.

### Commande Git possible

```bash
git log --graph --date=iso --pretty=format:%H%x1f%h%x1f%P%x1f%D%x1f%an%x1f%ad%x1f%s -n 200
```

### Approche MVP

- Parser les commits et leurs parents.
- Construire des noeuds React Flow.
- Afficher les relations parent/enfant.
- Ne pas chercher a reproduire parfaitement le rendu `git log --graph` au debut.

### DTO recommande

```ts
type GraphCommit = {
  hash: string
  shortHash: string
  parents: string[]
  refs: string[]
  authorName: string
  date: string
  subject: string
}
```

### Resultat attendu

Un graphe simple mais exploitable de l'historique Git.

## Phase 10 - Branches

### Objectif

Afficher et changer de branche.

### Commandes Tauri

```rust
#[tauri::command]
pub async fn list_branches(repo_path: String) -> Result<Vec<GitBranch>, AppError>

#[tauri::command]
pub async fn checkout_branch(repo_path: String, branch: String) -> Result<(), AppError>

#[tauri::command]
pub async fn create_branch(repo_path: String, branch: String) -> Result<(), AppError>
```

### Commandes Git

```bash
git branch --format=%(refname:short)%x1f%(HEAD)%x1f%(upstream:short)
git switch branch-name
git switch -c branch-name
```

### DTO recommande

```ts
type GitBranch = {
  name: string
  current: boolean
  upstream: string | null
}
```

### Resultat attendu

L'utilisateur peut voir les branches et changer de branche.

## Phase 11 - Remotes Basique

### Objectif

Ajouter fetch, pull et push.

### Commandes Tauri

```rust
#[tauri::command]
pub async fn fetch(repo_path: String) -> Result<(), AppError>

#[tauri::command]
pub async fn pull(repo_path: String) -> Result<(), AppError>

#[tauri::command]
pub async fn push(repo_path: String) -> Result<(), AppError>
```

### Commandes Git

```bash
git fetch --prune
git pull
git push
```

### Contraintes

- Laisser Git gerer les credentials.
- Capturer les erreurs SSH/HTTPS et les afficher clairement.
- Ne pas tenter de gerer l'authentification dans le MVP.

### Resultat attendu

L'utilisateur peut synchroniser un depot deja configure.

## Phase 12 - SQLite Local

### Objectif

Persister les donnees applicatives locales.

### Donnees a stocker

- Repos recents
- Dernier repo ouvert
- Preferences utilisateur
- Taille des panneaux UI
- Theme
- Cache optionnel de l'historique

### Schema initial

```sql
CREATE TABLE repositories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  last_opened_at TEXT NOT NULL
);

CREATE TABLE preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### Resultat attendu

L'application se souvient des depots recents et des preferences.

## Phase 13 - Monaco Editor

### Objectif

Ameliorer l'affichage des diffs.

### Taches

1. Ajouter Monaco Editor.
2. Afficher les diffs en lecture seule.
3. Ajouter coloration syntaxique si possible.
4. Prevoir plus tard un mode side-by-side.

### Resultat attendu

Les diffs sont plus lisibles et proches d'un vrai outil de developpement.

## Phase 14 - Gestion Des Conflits

### Objectif

Detecter et afficher les fichiers conflictuels.

### Git status

Les conflits apparaissent dans `git status --porcelain=v2`.

### UI

- Section `Conflicts`.
- Fichiers en conflit clairement visibles.
- Affichage du fichier avec marqueurs conflictuels.
- Pas de resolution avancee dans le MVP initial.

### Resultat attendu

L'utilisateur sait quand le depot est en conflit.

## Phase 15 - Securite Et Robustesse

### Regles importantes

- Ne jamais executer de commande shell construite par concatenation.
- Toujours passer les arguments Git comme tableau.
- Toujours utiliser `--` avant les chemins utilisateur.
- Verifier que le repo ouvert existe encore.
- Verifier que le dossier est toujours un repo Git avant les operations critiques.
- Afficher les erreurs Git sans masquer les informations utiles.
- Ne jamais supprimer des changements utilisateur sans confirmation.
- Ajouter confirmation avant discard, delete branch, reset, clean et force push.

## Phase 16 - Tests

### Backend Rust

Tester :

- parsing `status --porcelain=v2`
- parsing `git log`
- gestion des erreurs Git
- validation de repository
- paths avec espaces

### Frontend

Tester :

- affichage status
- selection fichier
- commit disabled si message vide
- refresh apres stage/unstage
- erreurs affichees correctement

### Tests d'integration manuels

Creer un depot temporaire et verifier :

1. repo propre ;
2. fichier modifie ;
3. fichier untracked ;
4. fichier staged ;
5. commit ;
6. branche creee ;
7. checkout branche ;
8. historique affiche.

## Roadmap Apres MVP

### Fonctionnalites Git

- Stash
- Amend commit
- Cherry-pick
- Revert commit
- Rebase simple
- Rebase interactif
- Tags
- Submodules
- Worktrees
- LFS
- Recherche dans l'historique
- Detail complet d'un commit
- Blame
- Comparaison entre branches

### UX

- Command palette
- Raccourcis clavier
- Split view diff
- File tree
- Recherche fichier
- Themes
- Multi-repo workspace
- Notifications d'operations longues

### Performance

- Cache SQLite de l'historique
- Chargement progressif du graphe
- Virtualisation des listes
- Worker cote frontend pour layout du graphe
- Canvas/WebGL si React Flow devient trop lent

### Migration Partielle Vers libgit2

A envisager seulement si :

- certaines commandes CLI deviennent trop lentes ;
- le parsing CLI devient fragile ;
- le graphe necessite beaucoup de donnees ;
- l'app doit fonctionner sans Git installe.

Ne pas migrer tout le backend d'un coup. Remplacer commande par commande.

## Ordre D'execution Recommande Pour Une IA

1. Initialiser le projet Tauri 2 React TypeScript.
2. Ajouter Tailwind.
3. Ajouter shadcn/ui.
4. Creer la structure de dossiers frontend/backend.
5. Creer la couche Rust `git/cli.rs`.
6. Creer les types d'erreur backend.
7. Implementer `validate_repository`.
8. Implementer l'ouverture de repo cote UI.
9. Implementer `get_status`.
10. Parser `git status --porcelain=v2 --branch`.
11. Afficher la liste des fichiers.
12. Implementer `get_file_diff`.
13. Afficher le diff texte brut.
14. Implementer stage/unstage.
15. Implementer commit.
16. Implementer historique simple.
17. Ajouter SQLite pour repos recents.
18. Ajouter Monaco Editor.
19. Ajouter React Flow pour graphe.
20. Ajouter branches.
21. Ajouter fetch/pull/push.

## Definition De Fini Du MVP

Le MVP est termine quand :

- l'app demarre sur macOS, Windows et Linux ;
- l'utilisateur peut ouvrir un depot Git ;
- l'etat du depot s'affiche correctement ;
- les diffs sont lisibles ;
- stage/unstage fonctionne ;
- commit fonctionne ;
- l'historique recent s'affiche ;
- les repos recents sont persistés ;
- les erreurs Git principales sont affichees clairement ;
- aucune operation destructive n'est possible sans confirmation.

## Notes De Design

L'interface doit rester sobre mais pas generique.

Proposition de layout :

- Sidebar gauche : repos recents, actions globales.
- Colonne gauche principale : fichiers modifies.
- Zone centrale : diff/code.
- Panneau bas : message de commit et actions.
- Panneau droit optionnel : historique/graphe.

Priorite UX :

1. Lisibilite du status.
2. Rapidite d'acces au diff.
3. Commit sans friction.
4. Feedback clair apres chaque operation.
5. Aucun risque de perte accidentelle de travail.
