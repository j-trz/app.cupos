# Graph Report - form-cupos  (2026-08-27)

## Corpus Check
- 299 files · ~351,758 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1676 nodes · 4474 edges · 126 communities (73 shown, 53 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 96 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `11f18711`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ai_handler.go
- netviax_atlas_service.go
- OportunityForm.jsx
- analytics_handler.go
- .get
- github.com/gin-gonic/gin.Context
- ItineraryPDF.jsx
- GestionProductos.jsx
- Button.jsx
- .post
- github.com/google/uuid.UUID
- init
- LogsDelSitio.jsx
- cn
- devDependencies
- Documentacion.jsx
- GestionNominas.jsx
- GestionReservas.jsx
- Reportes.jsx
- GestionGrupos.jsx
- ReservationService
- office365_auth.go
- App.jsx
- ProductService
- notification_service.go
- ResolveAgencyCode
- ApiClient
- email_config_handler.go
- order_handler.go
- .delete
- UserService
- Card.jsx
- What You Must Do When Invoked
- Product
- AgencyService
- group_handler.go
- qa_diagnostic_handler.go
- Layout.jsx
- UserForm.jsx
- WhiteLabelPreviewModal.jsx
- backup_handler.go
- FindAgencyByCodeOrName
- dependencies
- NotifyRoleByCode
- useWhiteLabel
- .request
- user_handler.go
- AIChatWindow.jsx
- itinerary_parser.go
- PermissionService
- Dashboard
- GetIntSettingForAgency
- ItineraryTable.jsx
- graphify reference: extra exports and benchmark
- system_handler.go
- white_label_handler.go
- form-cupos
- productImportSchema.js
- AtlasConfig
- canManageSharing
- BandejaTickets
- agency_handler.go
- ExportService
- resolveAgencyForSettings
- backend-go/vercel.json
- api_key_handler.go
- chart.js
- @radix-ui/react-popover
- class-variance-authority
- clsx
- framer-motion
- @headlessui/react
- @heroicons/react
- @hookform/resolvers
- i18next
- jspdf
- jspdf-autotable
- lucide-react
- pdfkit
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-avatar
- @radix-ui/react-checkbox
- @radix-ui/react-dialog
- @radix-ui/react-label
- @radix-ui/react-progress
- @radix-ui/react-select
- @radix-ui/react-slider
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-toast
- @radix-ui/react-tooltip
- react
- react-chartjs-2
- react-dropzone
- react-hook-form
- react-icons
- react-markdown
- react-router-dom
- react-tooltip
- recharts
- remark-gfm
- sweetalert2
- tailwind-merge
- tailwindcss-animate
- @tailwindcss/forms
- @tailwindcss/vite
- @tanstack/react-query
- xlsx
- zod
- frontend/vercel.json
- backend-go
- graphify reference: query, path, explain
- user_agency_handler.go
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- .claude/CLAUDE.md
- extraction-spec.md

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 64 edges
2. `cn()` - 61 edges
3. `ApiClient` - 44 edges
4. `Button()` - 39 edges
5. `ReservationService` - 37 edges
6. `ResolveAgencyCode()` - 36 edges
7. `AIService` - 29 edges
8. `Badge()` - 28 edges
9. `ReportService` - 27 edges
10. `GestionReservas()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `executeTool()` --calls--> `groupQuoteExpired()`  [INFERRED]
  backend-go/pkg/handlers/ai_handler.go → backend-go/pkg/handlers/group_handler.go
- `executeTool()` --calls--> `SendGroupQuoteRow()`  [INFERRED]
  backend-go/pkg/handlers/ai_handler.go → backend-go/pkg/handlers/group_handler.go
- `executeTool()` --calls--> `countPassengerSeats()`  [INFERRED]
  backend-go/pkg/handlers/ai_handler.go → backend-go/pkg/handlers/order_handler.go
- `executeTool()` --calls--> `parseDateFlexible()`  [INFERRED]
  backend-go/pkg/handlers/ai_handler.go → backend-go/pkg/handlers/order_handler.go
- `ResolveAtlasConfig()` --calls--> `FindAgencyByCodeOrName()`  [INFERRED]
  backend-go/pkg/services/netviax_atlas_service.go → backend-go/pkg/services/email_service.go

## Import Cycles
- None detected.

## Communities (126 total, 53 thin omitted)

### Community 0 - "ai_handler.go"
Cohesion: 0.06
Nodes (65): CreateAIExpert(), DeleteAIExpert(), DeleteAIExpertDocument(), expertAgencyScope(), expertNameTaken(), findExpertScoped(), GetAIExpert(), ListAIExpertDocuments() (+57 more)

### Community 1 - "netviax_atlas_service.go"
Cohesion: 0.08
Nodes (49): CreateAtlasConfig(), DeleteAtlasConfig(), GetAtlasConfig(), resolveAgencyForAtlasConfig(), resolveAtlasConfigForRequest(), TestAtlasConnectionHandler(), UpdateAtlasConfig(), BuscarContactoAtlas() (+41 more)

### Community 2 - "OportunityForm.jsx"
Cohesion: 0.06
Nodes (44): EMPTY_FORM, GroupForm(), toFormValues(), GroupOptionsFields(), AIRLINE_NAME_OPTIONS, emptyForm, ESTADO_AEROLINEA_OPTIONS, MOTIVO_RECHAZO_OPTIONS (+36 more)

### Community 3 - "analytics_handler.go"
Cohesion: 0.13
Nodes (48): AgenciasDataHandler(), canonicalTipoProducto(), cumpleEdadMenor2Anios(), DashboardDataHandler(), DestinosCompaniaHandler(), DetalleDestinosHandler(), EvolucionAgenciasHandler(), EvolucionPasajerosHandler() (+40 more)

### Community 4 - ".get"
Cohesion: 0.11
Nodes (8): ExpertPicker(), ExpertDocumentsPanel(), ExpertsTab(), useAIChat(), useGroup(), AIChatPage(), AIConfig(), AIService

### Community 5 - "github.com/gin-gonic/gin.Context"
Cohesion: 0.10
Nodes (35): ExportCSV(), ExportSystemLogsJSON(), GetSystemLogs(), CreateNotification(), DeleteNotification(), GetNotifications(), GetUnreadCount(), HideNotification() (+27 more)

### Community 6 - "ItineraryPDF.jsx"
Cohesion: 0.19
Nodes (14): AIChatItineraryResult(), parseToolResult(), computeDuration(), displayFlightDate(), displayHHmm(), ESTADO_COLORS, ESTADO_LABELS, ItineraryPDF() (+6 more)

### Community 7 - "GestionProductos.jsx"
Cohesion: 0.17
Nodes (25): EmptyState(), Modal(), ProductBulkUpload(), SkeletonTable(), ActionIconButton(), BulkSelectionBar(), Skeleton(), StatsHero() (+17 more)

### Community 8 - "Button.jsx"
Cohesion: 0.17
Nodes (11): STATUS_BADGE, emptyExpert, Badge(), Button(), Input(), PROVIDER_TYPES, TABS, getInitials() (+3 more)

### Community 9 - ".post"
Cohesion: 0.07
Nodes (13): useCancellations(), useDestinationsDetail(), useEvolutionPassengers(), useEvolutionRevenue(), useGeneralReport(), useOccupancy(), useRiskAlerts(), useSalesByAgency() (+5 more)

### Community 10 - "github.com/google/uuid.UUID"
Cohesion: 0.14
Nodes (35): buildSystemPrompt(), Agency, AIExpert, EmailTemplate, Group, Notification, NotificationTemplate, Permission (+27 more)

### Community 11 - "init"
Cohesion: 0.14
Nodes (23): Handler(), init(), main(), dropAgencyForeignKeys(), InitDB(), migrateSystemSettingsToAgencyAware(), runSQLMigrations(), seedEmailTemplates() (+15 more)

### Community 12 - "LogsDelSitio.jsx"
Cohesion: 0.10
Nodes (18): BackupPanel(), fmtDate(), fmtMs(), HoldsTable(), LEVEL_BADGE, LEVEL_LABEL, LogsTab(), minutesLeft() (+10 more)

### Community 13 - "cn"
Cohesion: 0.06
Nodes (61): Badge(), badgeVariants, buttonVariants, ShadcnButton, Card, CardContent, CardDescription, CardFooter (+53 more)

### Community 14 - "devDependencies"
Cohesion: 0.06
Nodes (31): eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, devDependencies, eslint, @eslint/js, eslint-plugin-react (+23 more)

### Community 15 - "Documentacion.jsx"
Cohesion: 0.09
Nodes (4): DEFAULT_DOCS_SECTION, DOCS_SECTIONS, visibleDocsSections(), SECTION_CONTENT

### Community 16 - "GestionNominas.jsx"
Cohesion: 0.16
Nodes (22): formatDateOnly(), getEstadoLabel(), getEstadoVariant(), BlockedReservationsWidget(), greetingFor(), initials(), NOTIF_COLOR, NOTIF_ICON (+14 more)

### Community 17 - "GestionReservas.jsx"
Cohesion: 0.10
Nodes (22): RFC-3339, BaggageFranchise(), CountdownTimer(), ItineraryTable(), ActionsOverflow(), useAcceptGroupQuote(), useRequestGroup(), useRequestGroupCancellation() (+14 more)

### Community 18 - "Reportes.jsx"
Cohesion: 0.10
Nodes (13): DashboardChart(), DataTable(), DepartureTable(), drawLabelPlugin, FiltersPanel(), KpiPanel(), LoadingSpinner(), PERIOD_OPTIONS (+5 more)

### Community 19 - "GestionGrupos.jsx"
Cohesion: 0.28
Nodes (13): useConfirmGroup(), useCreateGroup(), useDeleteGroup(), useGroups(), useResolveGroupCancellation(), useSendGroupQuote(), useUpdateGroup(), COTIZACION_LABEL (+5 more)

### Community 20 - "ReservationService"
Cohesion: 0.07
Nodes (18): absoluteUrl(), Availability(), Confirmations(), formatMoney(), statusLabel(), exportToExcel(), exportToExcelBO(), GestionNominas() (+10 more)

### Community 21 - "office365_auth.go"
Cohesion: 0.24
Nodes (15): LoginOffice365(), azureClientID(), azureTenantID(), fetchOpenIDConfig(), getJWKSKey(), Office365LoginConfigured(), refreshJWKS(), rsaPublicKeyFromJWK() (+7 more)

### Community 22 - "App.jsx"
Cohesion: 0.12
Nodes (21): App(), ProtectedRoute(), PageHeader(), AuthContext, useAuth(), usePermissions(), queryClient, Administracion() (+13 more)

### Community 23 - "ProductService"
Cohesion: 0.09
Nodes (12): ShareProductModal(), TransferModal(), useApproveProduct(), useCreateProduct(), useDeleteProduct(), useProduct(), useProducts(), useUpdateProduct() (+4 more)

### Community 24 - "notification_service.go"
Cohesion: 0.33
Nodes (11): createNotification(), NotifyAgency(), NotifyAgencyByCode(), NotifyBroadcast(), NotifyBroadcastByCode(), NotifyRole(), NotifyUser(), parseExtraEmails() (+3 more)

### Community 25 - "ResolveAgencyCode"
Cohesion: 0.12
Nodes (23): ApproveOpportunity(), BulkApproveOpportunities(), BulkDeleteOpportunities(), CreateOpportunity(), DeleteOpportunity(), fixOpportunityDates(), fixOpportunityNumbers(), GetOpportunities() (+15 more)

### Community 26 - "ApiClient"
Cohesion: 0.12
Nodes (4): AuthProvider(), ApiClient, AuthService, ticketService

### Community 27 - "email_config_handler.go"
Cohesion: 0.17
Nodes (15): callerOwnsTemplateAgency(), CreateEmailConfig(), DeleteEmailConfig(), GetEmailConfig(), GetEmailTemplates(), logEmailError(), resolveAgencyForEmailConfig(), SendTestEmail() (+7 more)

### Community 28 - "order_handler.go"
Cohesion: 0.10
Nodes (32): AddDocContable(), AddPassenger(), BulkCancelReservations(), BulkUpdateReservations(), callerOwnsReservation(), countPassengerSeats(), DeletePassenger(), DeleteReservation() (+24 more)

### Community 29 - ".delete"
Cohesion: 0.10
Nodes (4): ApiKeyPanel(), AlertRuleService, ApiKeyService, EmailTemplateService

### Community 30 - "UserService"
Cohesion: 0.10
Nodes (9): UserAgenciesModal(), useRoles(), useCreateUser(), useDeleteUser(), useUpdateUser(), useUser(), GestionUsuarios(), RoleService (+1 more)

### Community 31 - "Card.jsx"
Cohesion: 0.19
Nodes (15): DashboardCharts(), FALLBACK_COLORS, formatCompactUSD(), STATUS_COLORS, tooltipStyle, ToastNotification(), Card(), CardContent() (+7 more)

### Community 32 - "What You Must Do When Invoked"
Cohesion: 0.07
Nodes (26): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+18 more)

### Community 33 - "Product"
Cohesion: 0.22
Nodes (20): ConvertOpportunityToProduct(), applyCalculatedPrices(), ApproveProduct(), BulkCreateProducts(), BulkDuplicateProducts(), createdByFromContext(), CreateProduct(), DeleteProduct() (+12 more)

### Community 34 - "AgencyService"
Cohesion: 0.18
Nodes (5): useAgency(), useCreateAgency(), useDeleteAgency(), useUpdateAgency(), AgencyService

### Community 35 - "group_handler.go"
Cohesion: 0.16
Nodes (17): AcceptGroupQuote(), canViewAllGroups(), ConfirmGroup(), CreateGroup(), DeleteGroup(), fixGroupDates(), GetGroupByID(), GetGroupsReport() (+9 more)

### Community 36 - "qa_diagnostic_handler.go"
Cohesion: 0.27
Nodes (16): buildAIDictamenPrompt(), buildFallbackDictamen(), GenerateAIDictamen(), RunSystemQA(), testAPIEndpoints(), testBusinessIntegrity(), testDatabaseHealth(), testSecurityAndLogs() (+8 more)

### Community 37 - "Layout.jsx"
Cohesion: 0.18
Nodes (12): Layout(), Sidebar(), SidebarContext, SidebarProvider(), useSidebar(), HeaderContext, HeaderProvider(), useHeader() (+4 more)

### Community 38 - "UserForm.jsx"
Cohesion: 0.20
Nodes (12): PermissionSelector(), Checkbox, Select(), SelectContent(), SelectContext, SelectItem(), SelectTrigger(), SelectValue() (+4 more)

### Community 40 - "backup_handler.go"
Cohesion: 0.24
Nodes (14): BuildBackupDump(), DeleteBackupHandler(), DownloadBackupHandler(), ensureBackupsDir(), formatSize(), GenerateBackupHandler(), GetBackup(), ListBackupsHandler() (+6 more)

### Community 41 - "FindAgencyByCodeOrName"
Cohesion: 0.29
Nodes (12): PreviewEmailTemplate(), FindAgencyByCodeOrName(), lookupAgencySMTPConfig(), lookupGlobalSMTPConfig(), RenderTemplate(), resolveSMTPConfig(), resolveTemplate(), sendMail() (+4 more)

### Community 42 - "dependencies"
Cohesion: 0.15
Nodes (13): chartjs-plugin-datalabels, dependencies, chartjs-plugin-datalabels, papaparse, @radix-ui/react-dropdown-menu, @radix-ui/react-radio-group, @radix-ui/react-separator, react-dom (+5 more)

### Community 43 - "NotifyRoleByCode"
Cohesion: 0.21
Nodes (19): expireOverdueHolds(), expireOverdueReservations(), ExpireReservations(), warnExpiringReservations(), CheckDeadlineReminders(), warnGroupDeadlines(), warnProductDeadlines(), RequestGroup() (+11 more)

### Community 44 - "useWhiteLabel"
Cohesion: 0.18
Nodes (13): AIChatWidget(), applyCSSVariables(), DEFAULT_CONFIG, hexToRgb(), useColors(), useFonts(), useWhiteLabel(), WhiteLabelContext (+5 more)

### Community 45 - ".request"
Cohesion: 0.11
Nodes (7): WhiteLabelProvider(), EmailConfig(), NotificationTemplates(), WhiteLabelConfig(), EmailConfigService, NotificationTemplatesService, WhiteLabelService

### Community 46 - "user_handler.go"
Cohesion: 0.16
Nodes (19): assignedAgencyCodes(), attachUserRoles(), callerAgencyIfScoped(), CreateUser(), DeleteUser(), GetProfile(), GetUserById(), issueSession() (+11 more)

### Community 47 - "AIChatWindow.jsx"
Cohesion: 0.18
Nodes (11): AIChatInput(), AIChatMessage(), MARKDOWN_COMPONENTS, TOOL_LABELS, AIChatSessionsSidebar(), AIChatTopbar(), AIChatWindow(), AIPageContext (+3 more)

### Community 48 - "itinerary_parser.go"
Cohesion: 0.35
Nodes (10): extractSegmentLines(), filterSegLines(), normalizeItineraryText(), normTime(), ParseRuta(), parseSegmentLine(), splitBeforeMatches(), trimAll() (+2 more)

### Community 49 - "PermissionService"
Cohesion: 0.27
Nodes (5): useCreatePermission(), useDeletePermission(), usePermission(), useUpdatePermission(), PermissionService

### Community 50 - "Dashboard"
Cohesion: 0.33
Nodes (4): Dashboard(), formatCurrency(), Notificaciones(), NotificationService

### Community 51 - "GetIntSettingForAgency"
Cohesion: 0.39
Nodes (7): AdjustHold(), canReserveProduct(), CreateHold(), GetIntSetting(), GetIntSettingForAgency(), GetSetting(), settingValueToString()

### Community 52 - "ItineraryTable.jsx"
Cohesion: 0.18
Nodes (12): AIRLINE_LOGOS, AIRLINES, AIRPORT_TIMEZONES, CURATED_AIRLINES, CURATED_AIRPORTS, extractSegmentLines(), loadImgBitmap(), normalizeText() (+4 more)

### Community 53 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 54 - "system_handler.go"
Cohesion: 0.46
Nodes (7): buildHoldDetails(), GetSystemStatus(), DBStatus, HoldDetail, ServiceStatus, SystemCounts, SystemStatusResponse

### Community 55 - "white_label_handler.go"
Cohesion: 0.52
Nodes (6): CreateWhiteLabelConfig(), defaultWhiteLabelConfig(), DeleteWhiteLabelConfig(), GetWhiteLabelConfig(), mergeRecordAndConfig(), UpdateWhiteLabelConfig()

### Community 56 - "form-cupos"
Cohesion: 0.29
Nodes (6): Antes de actuar / al terminar, Correr en local, form-cupos, graphify, Más contexto, Reglas de oro (no negociables en este repo)

### Community 57 - "productImportSchema.js"
Cohesion: 0.47
Nodes (5): coerceBoolean(), coerceDateToISO(), EXCEL_EPOCH_MS, TIPOS_PRODUCTO_VALIDOS, validateProductRow()

### Community 59 - "canManageSharing"
Cohesion: 0.53
Nodes (5): canManageSharing(), ListSharedAgencies(), ShareProduct(), UnshareProduct(), shareProductInput

### Community 60 - "BandejaTickets"
Cohesion: 0.33
Nodes (7): BandejaTickets(), fmtCurrency(), fmtDate(), fmtDateTime(), segField(), TicketDetailModal(), ticketSegments()

### Community 61 - "agency_handler.go"
Cohesion: 0.33
Nodes (5): CreateAgency(), DeleteAgency(), ListAgencies(), ToggleMyAgencyAI(), UpdateAgency()

### Community 63 - "resolveAgencyForSettings"
Cohesion: 0.83
Nodes (3): ListSettings(), resolveAgencyForSettings(), UpdateSetting()

### Community 64 - "backend-go/vercel.json"
Cohesion: 0.50
Nodes (3): builds, routes, version

### Community 65 - "api_key_handler.go"
Cohesion: 0.47
Nodes (5): CreateAPIKeyHandler(), GenerateSecretKey(), HashAPIKey(), ListAPIKeysHandler(), RevokeAPIKeyHandler()

### Community 117 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 118 - "user_agency_handler.go"
Cohesion: 0.40
Nodes (4): AddUserAgency(), ListUserAgencies(), RemoveUserAgency(), addUserAgencyInput

### Community 119 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 120 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 121 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

## Knowledge Gaps
- **223 isolated node(s):** `graphify`, `Usage`, `What graphify is for`, `Step 0 - GitHub repos and multi-path merge (only if a URL or several paths)`, `Step 1 - Ensure graphify is installed` (+218 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **53 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiClient` connect `ApiClient` to `OportunityForm.jsx`, `.get`, `Button.jsx`, `.post`, `LogsDelSitio.jsx`, `cn`, `.request`, `GestionNominas.jsx`, `GestionReservas.jsx`, `PermissionService`, `Reportes.jsx`, `ReservationService`, `App.jsx`, `ProductService`, `.delete`, `UserService`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `App.jsx` to `OportunityForm.jsx`, `.get`, `GestionProductos.jsx`, `Button.jsx`, `.post`, `LogsDelSitio.jsx`, `cn`, `Documentacion.jsx`, `GestionNominas.jsx`, `GestionReservas.jsx`, `Reportes.jsx`, `GestionGrupos.jsx`, `ReservationService`, `ProductService`, `.delete`, `UserService`, `Layout.jsx`, `useWhiteLabel`, `.request`, `AIChatWindow.jsx`, `Dashboard`, `AtlasConfig`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `Button()` connect `Button.jsx` to `OportunityForm.jsx`, `UserForm.jsx`, `GestionProductos.jsx`, `WhiteLabelPreviewModal.jsx`, `LogsDelSitio.jsx`, `GestionNominas.jsx`, `GestionReservas.jsx`, `GestionGrupos.jsx`, `App.jsx`, `Card.jsx`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `graphify`, `Usage`, `What graphify is for` to the rest of the system?**
  _223 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ai_handler.go` be split into smaller, more focused modules?**
  _Cohesion score 0.05711849957374254 - nodes in this community are weakly interconnected._
- **Should `netviax_atlas_service.go` be split into smaller, more focused modules?**
  _Cohesion score 0.07811447811447811 - nodes in this community are weakly interconnected._
- **Should `OportunityForm.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.058445353594389245 - nodes in this community are weakly interconnected._