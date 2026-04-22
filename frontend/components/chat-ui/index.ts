/**
 * Chat UI Components — Copied from SecondstreamAI
 *
 * UI-only copy. Does NOT include:
 * - API hooks
 * - Data fetching logic
 * - Backend integration
 *
 * You need to provide your own:
 * - Thread management
 * - Message fetching
 * - API calls
 * - State management
 *
 * See README.md for usage instructions.
 */

// ============================================================================
// Main Chat Components
// ============================================================================

export { AppSidebar } from "./app-sidebar";
export { ChatScreen } from "./chat-screen";
export { ChatInterface } from "./chat-interface";
export { ChatPromptComposer } from "./chat-prompt-composer";
export { ChatSearch } from "./chat-search";
export { SettingsDialog } from "./settings-dialog";

// ============================================================================
// AI Elements — Core Chat Primitives
// ============================================================================

export {
	Attachment,
	AttachmentPreview,
	type AttachmentPreviewProps,
	type AttachmentProps,
	AttachmentRemove,
	type AttachmentRemoveProps,
	// Attachments
	Attachments,
	type AttachmentsProps,
} from "./ai-elements/attachments";
export {
	// Conversation container
	Conversation,
	ConversationContent,
	type ConversationContentProps,
	ConversationDownload,
	type ConversationDownloadProps,
	ConversationEmptyState,
	type ConversationEmptyStateProps,
	type ConversationMessage,
	type ConversationProps,
	ConversationScrollButton,
	messagesToMarkdown,
} from "./ai-elements/conversation";
export {
	// Message components
	Message,
	MessageAction,
	type MessageActionProps,
	MessageActions,
	type MessageActionsProps,
	MessageBranch,
	MessageBranchContent,
	type MessageBranchContentProps,
	MessageBranchNext,
	type MessageBranchNextProps,
	MessageBranchPage,
	type MessageBranchPageProps,
	MessageBranchPrevious,
	type MessageBranchPreviousProps,
	type MessageBranchProps,
	MessageBranchSelector,
	type MessageBranchSelectorProps,
	MessageContent,
	type MessageContentProps,
	type MessageProps,
	MessageResponse,
	type MessageResponseProps,
	MessageToolbar,
	type MessageToolbarProps,
} from "./ai-elements/message";
export {
	// Model selector
	ModelSelector,
	ModelSelectorContent,
	type ModelSelectorContentProps,
	ModelSelectorDialog,
	type ModelSelectorDialogProps,
	ModelSelectorEmpty,
	type ModelSelectorEmptyProps,
	ModelSelectorGroup,
	type ModelSelectorGroupProps,
	ModelSelectorInput,
	type ModelSelectorInputProps,
	ModelSelectorItem,
	type ModelSelectorItemProps,
	ModelSelectorList,
	type ModelSelectorListProps,
	ModelSelectorLogo,
	ModelSelectorLogoGroup,
	type ModelSelectorLogoGroupProps,
	type ModelSelectorLogoProps,
	ModelSelectorName,
	type ModelSelectorNameProps,
	type ModelSelectorProps,
	ModelSelectorSeparator,
	type ModelSelectorSeparatorProps,
	ModelSelectorShortcut,
	type ModelSelectorShortcutProps,
	ModelSelectorTrigger,
	type ModelSelectorTriggerProps,
} from "./ai-elements/model-selector";
export {
	PromptInput,
	PromptInputActionAddAttachments,
	type PromptInputActionAddAttachmentsProps,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	type PromptInputActionMenuContentProps,
	type PromptInputActionMenuProps,
	PromptInputActionMenuTrigger,
	type PromptInputActionMenuTriggerProps,
	PromptInputAttachment,
	PromptInputAttachmentPreview,
	type PromptInputAttachmentPreviewProps,
	type PromptInputAttachmentProps,
	PromptInputAttachmentRemove,
	type PromptInputAttachmentRemoveProps,
	PromptInputAttachments,
	type PromptInputAttachmentsProps,
	PromptInputBody,
	type PromptInputBodyProps,
	PromptInputButton,
	type PromptInputButtonProps,
	PromptInputFooter,
	type PromptInputFooterProps,
	PromptInputHeader,
	type PromptInputHeaderProps,
	type PromptInputMessage,
	type PromptInputProps,
	// Prompt input components
	PromptInputProvider,
	type PromptInputProviderProps,
	PromptInputSubmit,
	type PromptInputSubmitProps,
	PromptInputTextarea,
	type PromptInputTextareaProps,
	PromptInputTools,
	type PromptInputToolsProps,
	usePromptInputAttachments,
	usePromptInputController,
	usePromptInputReferencedSources,
} from "./ai-elements/prompt-input";
export {
	// Reasoning display
	Reasoning,
	ReasoningContent,
	type ReasoningContentProps,
	type ReasoningProps,
	ReasoningTrigger,
	type ReasoningTriggerProps,
} from "./ai-elements/reasoning";
export {
	// Shimmer loading effect
	Shimmer,
	type TextShimmerProps as ShimmerProps,
} from "./ai-elements/shimmer";
export {
	// Source citations
	Source,
	SourceContent,
	type SourceContentProps,
	type SourceProps,
	SourceTrigger,
	type SourceTriggerProps,
} from "./ai-elements/sources";
export {
	// Working memory updates
	WorkingMemoryUpdate,
} from "./ai-elements/working-memory-update";

// ============================================================================
// Utility Components
// ============================================================================

export { CopyButton } from "./copy-button";
export { OpenChatLogo } from "./openchat-logo";
export { RegenerateButton } from "./regenerate-button";

// ============================================================================
// UI Components (re-exported for convenience)
// ============================================================================

export { toast } from "sonner";
export {
	// Alert Dialog
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "./ui/alert-dialog";
export {
	// Button
	Button,
	type ButtonProps,
	buttonVariants,
} from "./ui/button";
export {
	// Button Group
	ButtonGroup,
	type ButtonGroupProps,
	ButtonGroupText,
	type ButtonGroupTextProps,
} from "./ui/button-group";
export {
	// Card
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./ui/card";
export {
	// Command Palette
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "./ui/command";
export {
	// Dialog
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./ui/dialog";
export {
	// Dropdown Menu
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
export {
	// Hover Card
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "./ui/hover-card";
export {
	// Input
	Input,
	type InputProps,
} from "./ui/input";
export {
	// Input Group
	InputGroup,
	InputGroupAddon,
	type InputGroupAddonProps,
	InputGroupButton,
	type InputGroupButtonProps,
	type InputGroupProps,
	InputGroupTextarea,
	type InputGroupTextareaProps,
} from "./ui/input-group";
export {
	// Label
	Label,
} from "./ui/label";
export {
	// Select
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
export {
	// Separator
	Separator,
} from "./ui/separator";
export {
	// Sheet
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "./ui/sheet";
export {
	// Sidebar
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarRail,
	SidebarTrigger,
	useSidebar,
} from "./ui/sidebar";
export {
	// Skeleton
	Skeleton,
} from "./ui/skeleton";
export {
	// Sonner (Toasts)
	Toaster,
} from "./ui/sonner";

export {
	// Spinner
	Spinner,
	type SpinnerProps,
} from "./ui/spinner";

export {
	// Tooltip
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";

// ============================================================================
// Re-export from hooks (copied utilities)
// ============================================================================

export { useDraftInput } from "@/hooks/use-draft-input";
export { useIsMobile as useMobile } from "@/hooks/use-mobile";

// ============================================================================
// Re-export from lib (copied utilities)
// ============================================================================

export {
	canSubmitPromptMessage,
	shouldShowLoadingShimmer,
} from "@/lib/chat-utils";

export { groupByDate } from "@/lib/date-utils";

// ============================================================================
// Re-export from types (copied types)
// ============================================================================

export type { MyUIMessage } from "@/types/ui-message";
