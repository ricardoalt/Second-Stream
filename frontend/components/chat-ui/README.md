# Chat UI Components — Copied from SecondstreamAI

Complete chat interface components copied from SecondstreamAI for use in SecondStream.

## ⚠️ Important Note

This is a **UI-only copy** from the SecondstreamAI project. Only the visual components and styles have been copied. 

**You need to:**
1. Install the dependencies listed below
2. Create your own pages that use these components
3. Connect to your own backend API
4. Handle data fetching yourself

## 📦 Dependencies to Install

```bash
cd frontend
bun add @ai-sdk/react @ai-sdk/amazon-bedrock ai motion use-stick-to-bottom streamdown @streamdown/cjk @streamdown/code @streamdown/math @streamdown/mermaid nanoid
```

## 📁 What's Included

### Components (`components/chat-ui/`)
- **ai-elements/** - 9 core chat primitives (conversation, message, prompt-input, etc.)
- **Main components** - chat-interface, chat-prompt-composer, app-sidebar, etc.
- **UI components** - 17 shadcn components (button, dialog, sidebar, etc.)

### Hooks (`hooks/`)
- use-draft-input.ts
- use-mobile.ts

### Utilities (`lib/`)
- chat-utils.ts
- date-utils.ts

### Types (`types/`)
- ui-message.ts

### Config (`config/`)
- models.ts

## 🚀 How to Use

### 1. Import Components

```tsx
import { 
  ChatInterface, 
  ChatPromptComposer,
  AppSidebar,
  Conversation,
  Message,
  PromptInput 
} from "@/components/chat-ui";
```

### 2. Create Your Own Page

Create a page file in your app directory:

```tsx
// app/chat/page.tsx
"use client";

import { ChatInterface, AppSidebar } from "@/components/chat-ui";

export default function MyChatPage() {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <div className="flex-1">
        <ChatInterface 
          initialMessages={[]} 
          threadId="my-thread-id"
        />
      </div>
    </div>
  );
}
```

### 3. Connect to Your Backend

The components use these data structures that you need to provide:

```typescript
interface Thread {
  id: string;
  title: string | null;
  resourceId: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts?: Array<{
    type: "text" | "file" | "reasoning" | "tool-webSearch" | "tool-updateWorkingMemory";
    text?: string;
    filename?: string;
    mediaType?: string;
    url?: string;
  }>;
}
```

## 🎨 Styling

The minimalistic scrollbar style has been added to `app/globals.css`. This gives the chat the same scrollbar appearance as SecondstreamAI (Linear/Vercel style).

## 📋 Available Exports

### Main Components
- `ChatInterface` - Complete chat interface
- `ChatPromptComposer` - Message input with attachments
- `AppSidebar` - Thread management sidebar
- `ChatSearch` - Thread search dialog
- `SettingsDialog` - Settings modal

### AI Elements
- `Conversation`, `ConversationContent`, `ConversationScrollButton`
- `Message`, `MessageContent`, `MessageActions`, `MessageResponse`
- `PromptInput`, `PromptInputTextarea`, `PromptInputSubmit`
- `Reasoning`, `Shimmer`, `Sources`, `WorkingMemoryUpdate`
- `Attachments`, `ModelSelector`

### UI Components
- `Button`, `Dialog`, `Sidebar`, `Card`, `Command`, `Select`, `Tooltip`, etc.

### Hooks
- `useDraftInput` - Manage draft input state
- `useMobile` - Mobile detection

## 🔧 Customization

All components accept standard React props and can be styled with:
- Tailwind classes via `className`
- CSS variables (defined in globals.css)
- Component-specific props

## 📝 Notes

- Components are client-side only ("use client")
- They expect React 19 and Next.js 15
- Uses Tailwind CSS v4
- Animations powered by `motion` (Framer Motion)

## 🆘 Troubleshooting

### "Module not found" errors
Make sure your `tsconfig.json` has the path alias:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Styles not working
The scrollbar styles are in `app/globals.css`. Make sure this file is imported in your layout.

### Component props errors
These components were copied as-is from SecondstreamAI. Some may reference types or utilities that you need to provide yourself (like thread management, API calls, etc.).

## 📚 Credits

Copied from: **SecondstreamAI** - GoodChat project
Components: **ai-elements** architecture + **shadcn/ui** primitives
