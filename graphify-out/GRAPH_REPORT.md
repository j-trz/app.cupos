# Graph Report - form-cupos  (2026-08-27)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1605 nodes · 4414 edges · 117 communities (65 shown, 52 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 96 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3fbc3dd9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 112
- Community 116

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
- `CardFooter` --calls--> `cn()`  [EXTRACTED]
  frontend/src/components/ui/shadcn-card.jsx → frontend/src/lib/utils.js
- `DropdownMenuCheckboxItem` --calls--> `cn()`  [EXTRACTED]
  frontend/src/components/ui/shadcn-dropdown-menu.jsx → frontend/src/lib/utils.js
- `DropdownMenuRadioItem` --calls--> `cn()`  [EXTRACTED]
  frontend/src/components/ui/shadcn-dropdown-menu.jsx → frontend/src/lib/utils.js
- `DropdownMenuShortcut()` --calls--> `cn()`  [EXTRACTED]
  frontend/src/components/ui/shadcn-dropdown-menu.jsx → frontend/src/lib/utils.js
- `DropdownMenuSubContent` --calls--> `cn()`  [EXTRACTED]
  frontend/src/components/ui/shadcn-dropdown-menu.jsx → frontend/src/lib/utils.js

## Import Cycles
- None detected.

## Communities (117 total, 52 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (69): CreateAIExpert(), DeleteAIExpert(), DeleteAIExpertDocument(), expertAgencyScope(), expertNameTaken(), findExpertScoped(), GetAIExpert(), ListAIExpertDocuments() (+61 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (49): CreateAtlasConfig(), DeleteAtlasConfig(), GetAtlasConfig(), resolveAgencyForAtlasConfig(), resolveAtlasConfigForRequest(), TestAtlasConnectionHandler(), UpdateAtlasConfig(), BuscarContactoAtlas() (+41 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (42): EMPTY_FORM, GroupForm(), toFormValues(), GroupOptionsFields(), AIRLINE_NAME_OPTIONS, emptyForm, ESTADO_AEROLINEA_OPTIONS, MOTIVO_RECHAZO_OPTIONS (+34 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (50): AgenciasDataHandler(), canonicalTipoProducto(), cumpleEdadMenor2Anios(), DashboardDataHandler(), DestinosCompaniaHandler(), DetalleDestinosHandler(), EvolucionAgenciasHandler(), EvolucionPasajerosHandler() (+42 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (18): AIChatInput(), AIChatMessage(), MARKDOWN_COMPONENTS, TOOL_LABELS, AIChatSessionsSidebar(), AIChatTopbar(), AIChatWindow(), ExpertPicker() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (37): CreateAgency(), DeleteAgency(), ListAgencies(), ToggleMyAgencyAI(), UpdateAgency(), ExportCSV(), ExportSystemLogsJSON(), GetSystemLogs() (+29 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (34): AIChatItineraryResult(), parseToolResult(), computeDuration(), displayFlightDate(), displayHHmm(), ESTADO_COLORS, ESTADO_LABELS, ItineraryPDF() (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (22): EmptyState(), SkeletonTable(), ActionIconButton(), Badge(), Skeleton(), StatsHero(), Table(), TableBody() (+14 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (19): STATUS_BADGE, emptyExpert, DashboardCharts(), FALLBACK_COLORS, formatCompactUSD(), STATUS_COLORS, tooltipStyle, Button() (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (12): useCancellations(), useDestinationsDetail(), useEvolutionPassengers(), useEvolutionRevenue(), useGeneralReport(), useOccupancy(), useRiskAlerts(), useSalesByAgency() (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (34): groupQuoteReadyToSend(), SendGroupQuote(), SendGroupQuoteRow(), Agency, AIExpert, EmailTemplate, Group, Notification (+26 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (28): Handler(), init(), main(), dropAgencyForeignKeys(), InitDB(), migrateSystemSettingsToAgencyAware(), runSQLMigrations(), seedEmailTemplates() (+20 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (18): BackupPanel(), fmtDate(), fmtMs(), HoldsTable(), LEVEL_BADGE, LEVEL_LABEL, LogsTab(), minutesLeft() (+10 more)

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (23): DialogContent, DialogDescription, DialogFooter(), DialogHeader(), DialogOverlay, DialogTitle, SelectContent, SelectItem (+15 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (31): eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, devDependencies, eslint, @eslint/js, eslint-plugin-react (+23 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (11): AIChatWidget(), useWhiteLabel(), DEFAULT_DOCS_SECTION, DOCS_SECTIONS, visibleDocsSections(), DocAlert(), DocList(), DocSteps() (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (24): formatDateOnly(), getEstadoLabel(), getEstadoVariant(), BlockedReservationsWidget(), greetingFor(), initials(), NOTIF_COLOR, NOTIF_ICON (+16 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (17): RFC-3339, BaggageFranchise(), CountdownTimer(), ItineraryTable(), BulkSelectionBar(), formatExpiry(), useCountdownTick(), EMPTY_FORM (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (11): DashboardChart(), DataTable(), DepartureTable(), drawLabelPlugin, FiltersPanel(), LoadingSpinner(), PERIOD_OPTIONS, PeriodSelector() (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (16): useAcceptGroupQuote(), useConfirmGroup(), useCreateGroup(), useDeleteGroup(), useGroup(), useGroups(), useRequestGroup(), useRequestGroupCancellation() (+8 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (10): Confirmations(), formatMoney(), statusLabel(), GestionNominas(), buildPassengerRows(), formatMoney(), GestionReservas(), sameAgency() (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (27): assignedAgencyCodes(), attachUserRoles(), GetProfile(), issueSession(), ListUsers(), Login(), LoginOffice365(), SwitchActiveAgency() (+19 more)

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (15): Modal(), ProtectedRoute(), TransferModal(), PageHeader(), AuthContext, useAuth(), queryClient, Administracion() (+7 more)

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (11): ShareProductModal(), useApproveProduct(), useCreateProduct(), useDeleteProduct(), useProduct(), useProducts(), useUpdateProduct(), formatMoney() (+3 more)

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (26): expireOverdueHolds(), expireOverdueReservations(), ExpireReservations(), warnExpiringReservations(), ConfirmReservation(), countPassengerSeats(), DeleteReservation(), RequestCancellation() (+18 more)

### Community 25 - "Community 25"
Cohesion: 0.13
Nodes (25): ApproveOpportunity(), BulkApproveOpportunities(), BulkDeleteOpportunities(), CreateOpportunity(), DeleteOpportunity(), fixOpportunityDates(), fixOpportunityNumbers(), GetOpportunities() (+17 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (4): AuthProvider(), ApiClient, AuthService, ticketService

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (21): callerOwnsTemplateAgency(), CreateEmailConfig(), DeleteEmailConfig(), GetEmailConfig(), GetEmailTemplates(), logEmailError(), PreviewEmailTemplate(), resolveAgencyForEmailConfig() (+13 more)

### Community 28 - "Community 28"
Cohesion: 0.14
Nodes (23): AddDocContable(), AddPassenger(), buildReservationEmailVars(), BulkCancelReservations(), BulkUpdateReservations(), callerOwnsReservation(), canReserveProduct(), CreateHold() (+15 more)

### Community 29 - "Community 29"
Cohesion: 0.11
Nodes (5): AlertRuleService, EmailTemplateService, adaptProduct(), adaptRequest(), toArray()

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (5): ApiKeyPanel(), UserAgenciesModal(), useUser(), ApiKeyService, UserService

### Community 31 - "Community 31"
Cohesion: 0.17
Nodes (17): ToastNotification(), ActionsOverflow(), genId(), useToast(), usePermissions(), useRoles(), useCreateUser(), useDeleteUser() (+9 more)

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (17): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+9 more)

### Community 33 - "Community 33"
Cohesion: 0.26
Nodes (19): ConvertOpportunityToProduct(), applyCalculatedPrices(), ApproveProduct(), BulkCreateProducts(), BulkDuplicateProducts(), createdByFromContext(), CreateProduct(), DeleteProduct() (+11 more)

### Community 34 - "Community 34"
Cohesion: 0.18
Nodes (9): ProductBulkUpload(), UserForm(), useAgencies(), useAgency(), useCreateAgency(), useDeleteAgency(), useUpdateAgency(), GestionAgencias() (+1 more)

### Community 35 - "Community 35"
Cohesion: 0.16
Nodes (16): AcceptGroupQuote(), canViewAllGroups(), ConfirmGroup(), CreateGroup(), DeleteGroup(), fixGroupDates(), GetGroupByID(), GetGroupsReport() (+8 more)

### Community 36 - "Community 36"
Cohesion: 0.27
Nodes (16): buildAIDictamenPrompt(), buildFallbackDictamen(), GenerateAIDictamen(), RunSystemQA(), testAPIEndpoints(), testBusinessIntegrity(), testDatabaseHealth(), testSecurityAndLogs() (+8 more)

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (12): Layout(), Sidebar(), SidebarContext, SidebarProvider(), useSidebar(), HeaderContext, HeaderProvider(), useHeader() (+4 more)

### Community 38 - "Community 38"
Cohesion: 0.20
Nodes (12): PermissionSelector(), Checkbox, Select(), SelectContent(), SelectContext, SelectItem(), SelectTrigger(), SelectValue() (+4 more)

### Community 39 - "Community 39"
Cohesion: 0.14
Nodes (8): KpiPanel(), StatCard(), previewModes, WhiteLabelPreviewModal(), DEFAULT_CONFIG, FONT_OPTIONS, PRESET_COLORS, tabs

### Community 40 - "Community 40"
Cohesion: 0.24
Nodes (14): BuildBackupDump(), DeleteBackupHandler(), DownloadBackupHandler(), ensureBackupsDir(), formatSize(), GenerateBackupHandler(), GetBackup(), ListBackupsHandler() (+6 more)

### Community 41 - "Community 41"
Cohesion: 0.30
Nodes (13): lookupAgencySMTPConfig(), lookupGlobalSMTPConfig(), RenderTemplate(), resolveSMTPConfig(), resolveTemplate(), sendMail(), sendMailImplicitTLS(), SendRawEmail() (+5 more)

### Community 42 - "Community 42"
Cohesion: 0.15
Nodes (13): chartjs-plugin-datalabels, dependencies, chartjs-plugin-datalabels, papaparse, @radix-ui/react-dropdown-menu, @radix-ui/react-radio-group, @radix-ui/react-separator, react-dom (+5 more)

### Community 43 - "Community 43"
Cohesion: 0.26
Nodes (9): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, ShadcnInput, Label (+1 more)

### Community 44 - "Community 44"
Cohesion: 0.21
Nodes (8): App(), applyCSSVariables(), DEFAULT_CONFIG, hexToRgb(), useColors(), useFonts(), WhiteLabelContext, WhiteLabelProvider()

### Community 47 - "Community 47"
Cohesion: 0.31
Nodes (9): UpdatePassengerTicket(), buildSegmentosJSON(), generateReservationLevelTicket(), GenerateTicketsForReservationInternal(), resolveVendedorEmail(), upsertTicketForPassenger(), Product, Reservation (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.35
Nodes (10): extractSegmentLines(), filterSegLines(), normalizeItineraryText(), normTime(), ParseRuta(), parseSegmentLine(), splitBeforeMatches(), trimAll() (+2 more)

### Community 49 - "Community 49"
Cohesion: 0.27
Nodes (5): useCreatePermission(), useDeletePermission(), usePermission(), useUpdatePermission(), PermissionService

### Community 50 - "Community 50"
Cohesion: 0.29
Nodes (4): Dashboard(), formatCurrency(), Notificaciones(), NotificationService

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (8): CheckDeadlineReminders(), warnGroupDeadlines(), warnProductDeadlines(), AdjustHold(), GetIntSetting(), GetIntSettingForAgency(), GetSetting(), settingValueToString()

### Community 52 - "Community 52"
Cohesion: 0.44
Nodes (7): Toast, ToastAction, ToastClose, ToastDescription, ToastTitle, toastVariants, ToastViewport

### Community 53 - "Community 53"
Cohesion: 0.24
Nodes (3): absoluteUrl(), Availability(), AtlasService

### Community 54 - "Community 54"
Cohesion: 0.46
Nodes (7): buildHoldDetails(), GetSystemStatus(), DBStatus, HoldDetail, ServiceStatus, SystemCounts, SystemStatusResponse

### Community 55 - "Community 55"
Cohesion: 0.52
Nodes (6): CreateWhiteLabelConfig(), defaultWhiteLabelConfig(), DeleteWhiteLabelConfig(), GetWhiteLabelConfig(), mergeRecordAndConfig(), UpdateWhiteLabelConfig()

### Community 57 - "Community 57"
Cohesion: 0.38
Nodes (6): coerceBoolean(), coerceDateToISO(), EXCEL_EPOCH_MS, PRODUCT_IMPORT_COLUMNS, TIPOS_PRODUCTO_VALIDOS, validateProductRow()

### Community 59 - "Community 59"
Cohesion: 0.53
Nodes (5): canManageSharing(), ListSharedAgencies(), ShareProduct(), UnshareProduct(), shareProductInput

### Community 60 - "Community 60"
Cohesion: 0.33
Nodes (5): CreateTransfer(), GetUserTransfers(), ListTransfers(), ReclaimTransfer(), TransferInput

### Community 63 - "Community 63"
Cohesion: 0.83
Nodes (3): ListSettings(), resolveAgencyForSettings(), UpdateSetting()

### Community 64 - "Community 64"
Cohesion: 0.50
Nodes (3): builds, routes, version

### Community 65 - "Community 65"
Cohesion: 0.28
Nodes (5): Badge(), badgeVariants, buttonVariants, ShadcnButton, ShadcnTextarea

## Knowledge Gaps
- **175 isolated node(s):** `expertInput`, `itinerarioProductoDTO`, `itinerarioReservaDTO`, `knownPage`, `BuscarContactoAtlasRequest` (+170 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **52 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Community 22` to `Community 2`, `Community 4`, `Community 7`, `Community 8`, `Community 9`, `Community 12`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 23`, `Community 30`, `Community 31`, `Community 34`, `Community 37`, `Community 39`, `Community 43`, `Community 45`, `Community 46`, `Community 50`, `Community 58`, `Community 61`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `ApiClient` connect `Community 26` to `Community 2`, `Community 4`, `Community 8`, `Community 9`, `Community 12`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 29`, `Community 30`, `Community 34`, `Community 43`, `Community 44`, `Community 45`, `Community 49`, `Community 56`, `Community 61`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `Button()` connect `Community 8` to `Community 2`, `Community 34`, `Community 38`, `Community 7`, `Community 39`, `Community 12`, `Community 16`, `Community 17`, `Community 22`, `Community 31`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `expertInput`, `itinerarioProductoDTO`, `itinerarioReservaDTO` to the rest of the system?**
  _175 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05368382080710848 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07811447811447811 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06397306397306397 - nodes in this community are weakly interconnected._