# UI Refactoring Tasks

## Overview
We need to implement a new, modernized frontend that can coexist with our current implementation. The refactored UI must strictly adhere to the latest standards and best practices for:
- [React 19](fetch https://react.dev/blog/2024/12/05/react-19) (stable release)
- [TailwindCSS 4](fetch https://tailwindcss.com/blog/tailwindcss-v4) (latest version)
- [shadcn UI](fetch https://ui.shadcn.com/docs/tailwind-v4#nextjs) (with Tailwind v4 compatibility)
- [PostCSS](fetch https://tailwindcss.com/docs/installation/framework-guides/nextjs) (as configured in Next.js)

**Mobile-first design is a critical requirement** for this implementation, with all components optimized for touch interfaces, variable screen sizes, and different device capabilities.

**Be sure to thoroughly research our current routes and backend architecture before creating code examples or snippets. Your solutions should seamlessly integrate with our existing infrastructure, follow established patterns, and leverage currently implemented backend services. Analyze our codebase structure, API design principles, authentication mechanisms, and data flow to ensure your examples are directly applicable, maintainable, and consistent with our development standards.**

## Technology Integration Architecture

### Comprehensive Integration of Technologies

This refactoring requires a sophisticated integration of multiple cutting-edge technologies, each with specific roles and integration points:

#### Next.js 15 + React 19 + TailwindCSS 4 + OpenAPI

![Technology Integration Architecture]

#### 1. Framework Foundation: Next.js 15 App Router
The Next.js 15 App Router serves as the foundation of our architecture, providing:

- **Server Components**: Enabling [component-level streaming](fetch https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming) for progressive UI rendering
- **Route Handlers**: For [API endpoints](fetch https://nextjs.org/docs/app/building-your-application/routing/route-handlers) that connect to backend services
- **Layouts and Templates**: For [consistent UI structure](fetch https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts) across the application

Next.js 15 introduces enhanced integration with React 19 features, particularly:
- Support for React 19's new [asset loading APIs](fetch https://react.dev/blog/2024/12/05/react-19#support-for-preloading-resources)
- Enhanced Server Components with [improved hydration stability](fetch https://react.dev/blog/2024/12/05/react-19#compatibility-with-third-party-scripts-and-extensions)
- Improved error handling with React 19's [error reporting system](fetch https://react.dev/blog/2024/12/05/react-19#better-error-reporting)

**Further Reading**: [Next.js 15 Documentation](fetch https://nextjs.org/docs)

#### 2. UI Framework: React 19 Features
React 19 provides core capabilities that enhance our UI:

- **Actions API**: For form handling and data mutations:
  ```tsx
  // Example using React 19 Actions with Next.js route handler
  function UpdateProfile() {
    const [error, submitAction, isPending] = useActionState(
      async (previousState, formData) => {
        'use server'; // Next.js server action
        try {
          const result = await updateUserProfile(formData);
          return null; // Success
        } catch (error) {
          return error.message;
        }
      },
      null
    );
    
    return (
      <form action={submitAction}>
        {/* Form fields */}
        <button disabled={isPending}>Update Profile</button>
        {error && <p className="text-red-500">{error}</p>}
      </form>
    );
  }
  ```
  [Reference: React 19 Actions API](fetch https://react.dev/blog/2024/12/05/react-19#actions)

- **Streaming with Resource APIs**: For real-time chat messages:
  ```tsx
  // Using React 19's `use` with Next.js streaming response
  function ChatMessages({ conversationId }) {
    const messages = use(fetchMessages(conversationId));
    
    return (
      <div className="space-y-4">
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
    );
  }
  
  // This would connect to an OpenAPI-defined endpoint
  async function fetchMessages(conversationId) {
    // Next.js route handler returns a streaming response
    const response = await fetch(`/api/chat/${conversationId}/messages`, {
      headers: { accept: 'text/event-stream' }
    });
    return streamAsyncIterator(response.body);
  }
  ```
  [Reference: React 19 `use` directive](fetch https://react.dev/blog/2024/12/05/react-19#new-api-use)

- **Optimistic Updates**: For responsive chat interactions:
  ```tsx
  function MessageInput({ conversationId }) {
    const [messages, setMessages] = useState([]);
    const [optimisticMessages, addOptimisticMessage] = useOptimistic(
      messages,
      (state, newMessage) => [...state, { ...newMessage, status: 'sending' }]
    );
    
    const sendMessage = async (formData) => {
      const messageText = formData.get('message');
      const newMessage = { id: crypto.randomUUID(), text: messageText, sender: 'user' };
      
      // Immediately show message in UI
      addOptimisticMessage(newMessage);
      
      // Send to API (OpenAPI-defined endpoint)
      await fetch(`/api/chat/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: messageText }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Update actual message list after successful API call
      setMessages(prev => [...prev, newMessage]);
    };
    
    return (
      <>
        <MessageList messages={optimisticMessages} />
        <form action={sendMessage}>
          <input name="message" />
          <button type="submit">Send</button>
        </form>
      </>
    );
  }
  ```
  [Reference: React 19 useOptimistic](fetch https://react.dev/blog/2024/12/05/react-19#new-hook-useoptimistic)

**Further Reading**: [React 19 Blog Post](fetch https://react.dev/blog/2024/12/05/react-19)

#### 3. Styling System: TailwindCSS 4
TailwindCSS 4 provides modern styling capabilities:

- **Simplified Color System**: For consistent theme application:
  ```tsx
  // Example using TailwindCSS 4's simplified colors for chat bubbles
  function MessageBubble({ message }) {
    const isUser = message.sender === 'user';
    
    return (
      <div className={`p-4 rounded-lg ${
        isUser 
          ? 'bg-primary text-primary-foreground self-end' 
          : 'bg-muted text-muted-foreground self-start'
      }`}>
        {message.text}
      </div>
    );
  }
  ```
  [Reference: TailwindCSS 4 Colors](fetch https://tailwindcss.com/blog/tailwindcss-v4#simplified-color-palette-system)

- **Logical Properties**: For better internationalization support:
  ```tsx
  // TailwindCSS 4 logical properties for RTL-compatible chat layout
  <div className="flex flex-col gap-4 ps-4 pe-12 my-4">
    {/* Chat messages with proper spacing for all reading directions */}
  </div>
  ```
  [Reference: TailwindCSS 4 Logical Properties](fetch https://tailwindcss.com/blog/tailwindcss-v4#logical-properties)

- **Container Queries**: For responsive component-level design:
  ```css
  /* tailwind.config.js */
  module.exports = {
    theme: {
      extend: {
        containerQueries: {
          'sm': '400px',
          'md': '600px',
          'lg': '800px',
        }
      }
    }
  }
  ```

  ```tsx
  // Using container queries for adaptive chat layout
  <div className="@container">
    <div className="@md:grid @md:grid-cols-2 @sm:flex @sm:flex-col">
      {/* Adaptive chat UI based on container width */}
    </div>
  </div>
  ```
  [Reference: TailwindCSS 4 Container Queries](fetch https://tailwindcss.com/docs/container-queries)

**Further Reading**: [TailwindCSS 4 Blog Post](fetch https://tailwindcss.com/blog/tailwindcss-v4)

#### 4. API Integration: OpenAPI
OpenAPI specifications define our API contract and enable:

- **Type-Safe API Clients**: Generated from OpenAPI specs:
  ```tsx
  // Using TypeScript types generated from OpenAPI specs
  import { ChatApi } from '../generated/apis';
  import { MessageDto } from '../generated/models';

  function ChatPage({ conversationId }) {
    const [messages, setMessages] = useState<MessageDto[]>([]);
    
    useEffect(() => {
      const chatApi = new ChatApi();
      chatApi.getMessages(conversationId)
        .then(response => setMessages(response.data))
        .catch(error => console.error('Failed to fetch messages', error));
    }, [conversationId]);
    
    // Component rendering
  }
  ```

- **Server Route Handlers**: Implementing OpenAPI spec:
  ```tsx
  // app/api/chat/[conversationId]/messages/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { streamResponse } from '@/lib/stream';
  import { chatService } from '@/services/chat';

  export async function GET(
    request: NextRequest,
    { params }: { params: { conversationId: string } }
  ) {
    // Implement endpoint defined in OpenAPI spec
    const stream = chatService.streamMessages(params.conversationId);
    return streamResponse(stream);
  }

  export async function POST(
    request: NextRequest,
    { params }: { params: { conversationId: string } }
  ) {
    const { text } = await request.json();
    const result = await chatService.sendMessage(params.conversationId, text);
    return NextResponse.json(result);
  }
  ```

- **Integration with React Query**: For data fetching and caching:
  ```tsx
  // Using React Query with OpenAPI-generated client
  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
  import { ChatApi } from '../generated/apis';

  export function useChatMessages(conversationId) {
    const chatApi = new ChatApi();
    
    return useQuery({
      queryKey: ['messages', conversationId],
      queryFn: () => chatApi.getMessages(conversationId).then(res => res.data)
    });
  }

  export function useSendMessage() {
    const queryClient = useQueryClient();
    const chatApi = new ChatApi();
    
    return useMutation({
      mutationFn: ({ conversationId, text }) => 
        chatApi.sendMessage(conversationId, { text }).then(res => res.data),
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      }
    });
  }
  ```

**Further Reading**: [OpenAPI Specification](fetch https://spec.openapis.org/oas/latest.html)

### Technology-Specific Integration Patterns

#### Next.js 15 App Router with React 19

1. **Server Actions + Form Handling**:
   ```tsx
   // app/settings/page.tsx
   import { updateSettings } from '@/actions/settings';

   export default function SettingsPage() {
     return (
       <form action={updateSettings}>
         <input type="text" name="username" />
         <button type="submit">Save</button>
       </form>
     );
   }

   // actions/settings.ts
   'use server';
   import { revalidatePath } from 'next/cache';

   export async function updateSettings(formData: FormData) {
     const username = formData.get('username');
     // Update in database
     revalidatePath('/settings');
   }
   ```
   [Reference: Next.js Server Actions](fetch https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

2. **Message Streaming with Suspense**:
   ```tsx
   // app/chat/[id]/page.tsx
   import { Suspense } from 'react';
   import { MessageStream } from '@/components/message-stream';
   import { Loading } from '@/components/loading';

   export default function ChatPage({ params }: { params: { id: string } }) {
     return (
       <div className="h-dvh flex flex-col">
         <Suspense fallback={<Loading />}>
           <MessageStream conversationId={params.id} />
         </Suspense>
       </div>
     );
   }
   ```
   [Reference: React 19 Suspense with Streaming](fetch https://react.dev/reference/react/Suspense)

#### TailwindCSS 4 with shadcn UI

1. **Component Styling with shadcn**:
   ```tsx
   // components/ui/message-bubble.tsx
   import { cn } from "@/lib/utils";
   import { Message } from "@/types";

   interface MessageBubbleProps {
     message: Message;
     className?: string;
   }

   export function MessageBubble({ 
     message, 
     className 
   }: MessageBubbleProps) {
     const isUser = message.role === 'user';
     
     return (
       <div
         className={cn(
           "rounded-lg p-4 max-w-[85%]",
           isUser ? 
             "bg-primary text-primary-foreground ml-auto" : 
             "bg-muted text-muted-foreground",
           className
         )}
       >
         {message.content}
       </div>
     );
   }
   ```
   [Reference: shadcn UI Usage with Tailwind v4](fetch https://ui.shadcn.com/docs/tailwind-v4#nextjs)

2. **Responsive Layouts with Dynamic Viewport Units**:
   ```tsx
   // components/chat-container.tsx
   export function ChatContainer({ children }) {
     return (
       <div className="flex flex-col h-dvh overflow-hidden">
         <div className="flex-1 overflow-y-auto p-4 space-y-4">
           {children}
         </div>
       </div>
     );
   }
   ```
   [Reference: TailwindCSS 4 Dynamic Viewport Units](fetch https://tailwindcss.com/blog/tailwindcss-v4#dynamic-viewport-units)

#### OpenAPI with React 19 Features

1. **Optimistic Updates with OpenAPI Types**:
   ```tsx
   // hooks/use-messages.tsx
   import { useOptimistic } from 'react';
   import { MessageDto } from '@/generated/models';
   import { useSendMessage } from '@/hooks/api';

   export function useMessages(conversationId: string, initialMessages: MessageDto[]) {
     const [messages, setMessages] = useState<MessageDto[]>(initialMessages);
     
     const [optimisticMessages, addOptimisticMessage] = useOptimistic(
       messages,
       (state: MessageDto[], newMessage: Partial<MessageDto>) => [
         ...state,
         { 
           id: crypto.randomUUID(),
           timestamp: new Date().toISOString(),
           status: 'pending',
           ...newMessage
         } as MessageDto
       ]
     );
     
     const sendMessageMutation = useSendMessage();
     
     const sendMessage = async (text: string) => {
       // Add optimistic message
       const optimisticId = crypto.randomUUID();
       addOptimisticMessage({
         id: optimisticId,
         content: text,
         role: 'user'
       });
       
       // Actual API call
       try {
         const result = await sendMessageMutation.mutateAsync({
           conversationId,
           text
         });
         
         // Update with actual message from API
         setMessages(current => [
           ...current.filter(m => m.id !== optimisticId),
           result
         ]);
       } catch (error) {
         // Error handling
         console.error('Failed to send message', error);
       }
     };
     
     return {
       messages: optimisticMessages,
       sendMessage
     };
   }
   ```
   [Reference: React 19 useOptimistic with APIs](fetch https://react.dev/reference/react/useOptimistic)

2. **Streaming API Responses**:
   ```tsx
   // app/api/chat/[id]/stream/route.ts
   import { NextRequest } from 'next/server';
   import { chatService } from '@/services/chat';

   export async function GET(
     request: NextRequest,
     { params }: { params: { id: string } }
   ) {
     const encoder = new TextEncoder();
     const stream = new ReadableStream({
       async start(controller) {
         const messageStream = await chatService.streamChatCompletion(params.id);
         
         for await (const chunk of messageStream) {
           controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
         }
         
         controller.close();
       }
     });
     
     return new Response(stream, {
       headers: {
         'Content-Type': 'text/event-stream',
         'Cache-Control': 'no-cache',
         'Connection': 'keep-alive'
       }
     });
   }
   ```
   
   ```tsx
   // components/streaming-message.tsx
   import { use } from 'react';
   import { fetchStreamingMessage } from '@/lib/api';
   
   export function StreamingMessage({ messageId }) {
     const messageStream = use(fetchStreamingMessage(messageId));
     
     return (
       <div className="chat-message assistant">
         {messageStream}
       </div>
     );
   }
   ```
   [Reference: Next.js Streaming with React 19](fetch https://nextjs.org/docs/app/api-reference/functions/generate-metadata#streaming)

## Technology Standards Compliance

### React 19 Requirements
- Utilize new Actions API for form handling and data mutations
- Implement `useOptimistic` for responsive UI during async operations
- Use the `use` directive for resource handling in render
- Leverage Suspense for improved loading states
- Utilize asset loading improvements (stylesheets, scripts)
- Implement proper error boundaries with the improved error reporting system
- Apply resource preloading APIs for performance optimization
- Use concurrent rendering features to maintain responsiveness

### TailwindCSS 4 Requirements
- Utilize the simplified color palette system
- Implement logical properties for better internationalization
- Apply the new `flex-grow-*` and other updated utilities
- Use the new standalone CLI for optimal build performance
- Leverage @layer for proper CSS organization
- Implement arbitrary property syntax for complex style scenarios
- Use dynamic viewport units for responsive design

### shadcn UI Integration
- Follow component composition patterns from shadcn
- Implement proper theme configuration for dark/light modes
- Use the recommended patterns for form components
- Apply accessibility enhancements from shadcn components
- Maintain consistent animation and transition patterns

### Mobile Optimization Requirements
- Implement touch-friendly UI elements with appropriate sizing (minimum 44×44px touch targets)
- Design for variable screen sizes using modern CSS techniques (container queries)
- Optimize performance for lower-power devices
- Implement swipe gestures for common actions
- Ensure keyboard accessibility for hybrid devices
- Apply reduced motion options for accessibility
- Design for offline capability and poor network conditions
- Implement responsive typography and spacing
- Optimize asset loading for mobile networks
- Support device orientation changes gracefully

## Parallel Implementation Strategy
To enable the refactored frontend to live alongside our current code:

1. **Feature Flag System**:
   - Create a global feature flag context to toggle between new and old UI components
   - Implement localStorage persistence for user preferences
   - Add an admin toggle in development environment

2. **Parallel Route Structure**:
   - Create a new `/new` route prefix (e.g., `/new/chat` alongside `/chat`)
   - Use layout components that selectively render either legacy or new implementations
   - Share authentication and data fetching logic between implementations

3. **Module Structure**:
   - Place new components in a separate directory structure: `frontend/components-v2/`
   - Create a separate set of hooks and utilities in `frontend/lib-v2/`
   - Use TypeScript path aliases to avoid import confusion

4. **Shared State Layer**:
   - Create adapter patterns to connect both UIs to the same data sources
   - Use common context providers wrapped with version-specific UI components
   - Implement events system for cross-version communication when needed

5. **Separate Styling Concerns**:
   - Leverage TailwindCSS 4 layers to prevent class conflicts
   - Use component-specific CSS modules for scoped styling
   - Implement theme tokens through CSS variables for consistency

## Component Requirements

### Sidebar Component
- Implement centralized sidebar context with TypeScript
- Handle responsive layouts and animations
- Manage width transitions and state persistence
- Follow shadcn UI component patterns
- Include accessibility considerations
- Document all props, types and usage examples
- **Optimize for mobile** with collapsible/swipeable patterns

**Key Considerations Based on Current Issues**:
- Use a single, consistent state management approach for sidebar width/collapse state
- Dynamically update CSS custom properties when sidebar state changes
- Standardize width units (choose either rem or px consistently throughout)
- Use proper CSS variables instead of hardcoded values for all width calculations
- Emit custom events when sidebar state changes for dependent components to react
- Decide on a single positioning method (either `fixed` or `sticky`) and use it consistently
- Create clear documentation on how child components should reference sidebar dimensions
- Implement proper z-index management to avoid stacking context issues
- Add transition synchronization between sidebar and main content
- Implement touch-friendly handles and gestures for mobile interactions
- Design for desktop/mobile use with different interaction patterns

### Chat Layout Component
- Create proper chat container architecture
- Implement reliable message auto-scrolling
- Handle loading states and transitions
- Manage chat input positioning
- Document component hierarchy
- Include responsive design considerations
- Add error boundary implementation
- Specify state management patterns
- **Optimize for mobile keyboards and text input**

**Chat UI Features**:
1. **Message Styling**:
   - Implement alternating colored chat bubbles for user/assistant messages
   - Design visually distinct message styles with proper spacing and padding
   - Support rich markdown content with syntax highlighting
   - Apply appropriate typography for readability across devices

2. **Interactive Message Features**:
   - Implement message reactions system with:
     - Thumbs up/down feedback buttons
     - Copy message button with clipboard interaction
     - Regenerate option for assistant responses
     - Star/favorite messages functionality
   - Create specialized tool usage badge/indicator when assistant uses tools
   - Design aesthetically pleasing user and assistant avatars with appropriate sizing

3. **Streaming and Real-time Feedback**:
   - Implement seamless message streaming with React 19 resource APIs
   - Create smooth typing indicators and loading states
   - Design progress bar showing context window usage
   - Display token count and cost metrics for transparency
   - Include visual indicators for thinking/processing states

4. **Conversation Management**:
   - Create conversation list/history panel with filtering options
   - Implement message editing functionality for revising previous messages
   - Design conversation branching visualization when editing past messages
   - Support conversation naming and organization
   - Include conversation export functionality

5. **Media and File Handling**:
   - Implement file upload system with:
     - Drag and drop support
     - Progress indicators
     - Preview capabilities for common file types
     - Size and type validation
   - Design proper image rendering within the chat flow
   - Support for downloadable files and attachments

6. **Input Enhancements**:
   - Create prompt enhancer button near send button to improve message quality
   - Implement slash commands for quick actions
   - Add @mention functionality for referencing content
   - Include input history and suggestion system
   - Support multiline input with proper expansion/collapse

**Key Considerations Based on Current Issues**:
- Simplify the nested container hierarchy to reduce complexity
- Standardize overflow handling across parent and child containers
- Use a single, consistent approach for message scrolling
- Implement ResizeObserver instead of multiple timeout-based scroll attempts
- Use React refs rather than direct DOM queries for measurements
- Ensure consistent spacing and padding throughout the layout
- Properly handle fixed-positioned elements relative to the sidebar width
- Create a spacer element that dynamically matches the input height
- Implement proper cleanup for all event listeners and observers
- Use CSS variables for all measurements and positioning
- Ensure scrollable containers have appropriate min-height/max-height constraints
- Avoid CSS that creates double spacing effects (like duplicate margins/padding)
- Standardize all scroll behavior configurations
- Design for small screens with efficient space utilization
- Implement virtual scrolling for performance on mobile devices
- Handle virtual keyboard appearance/disappearance gracefully

**API Integration**:
- Connect all chat features to existing OpenAPI routes
- Implement proper data fetching with React 19 patterns
- Use optimistic updates for immediate user feedback
- Create robust error handling for API failures
- Design appropriate caching strategies for performance
- Implement proper offline behavior with queue system for pending actions

### Header Component
**Layout Requirements**:
- Spans from left sidebar edge to right screen edge
- Adapts width when sidebar collapses/expands
- Centers search box relative to full viewport width
- Maintains consistent height
- **Collapses appropriately on mobile** to maximize content space

**Component Requirements**:
1. Profile Section (Top Right)
   - Dropdown menu with: Github link, Documentation link, Settings option, Admin access
   - Avatar/user info display
   - Proper hover/focus states
   - Touch-friendly tappable areas

2. Theme Toggle (Left of Profile)
   - Light/dark mode switch with React 19 theme management
   - Smooth transition effects
   - Accessibility considerations
   - Automatic system preference detection

3. Notifications Area
   - Between theme toggle and profile
   - Badge indicators
   - Dropdown notifications panel
   - Read/unread states
   - Mobile-optimized notification viewing

4. Search Box
   - Centered relative to full viewport
   - Type-ahead functionality using React 19 resource APIs
   - Keyboard navigation support
   - Loading states
   - Mobile-optimized search experience

**Key Considerations Based on Current Issues**:
- Use CSS variables to reference sidebar width rather than hardcoded values
- Listen for sidebar state changes to adjust positioning dynamically
- Implement proper stacking context (z-index) management
- Use consistent positioning method that works with both the sidebar and content
- Avoid fixed pixel measurements where relative or responsive units would be better
- Ensure proper width calculations that don't cause overflow or unintended spacing
- Handle transition state synchronization with the sidebar
- Implement proper resize handling for window size changes
- Use container queries for responsive adaptations
- Implement a mobile-specific collapsed view that expands on interaction

## Technical Requirements
- Use React 19 features (hooks, suspense, etc) following [official guidelines](fetch https://react.dev/blog/2024/12/05/react-19)
- Implement TailwindCSS 4 best practices as documented in the [release notes](fetch https://tailwindcss.com/blog/tailwindcss-v4)
- Follow shadcn UI component patterns with [Tailwind v4 compatibility](fetch https://ui.shadcn.com/docs/tailwind-v4#nextjs)
- Apply Next.js integration best practices according to [official documentation](fetch https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- Add proper TypeScript types with strict typing
- Include error boundaries with React 19's improved error reporting
- Handle loading states with Suspense
- Ensure responsive design with mobile-first approach
- Follow accessibility guidelines (WCAG 2.1 AA minimum)
- Optimize performance using React 19's preloading APIs and resource management
- Add proper documentation with TypeScript JSDoc comments
- Include test specifications for component testing

## Cross-Component Technical Guidelines Based on Debugging Findings
- **Unified CSS Variable Strategy**: Define a single source of truth for all layout measurements
- **Consistent Positioning Method**: Choose either fixed, absolute, or sticky positioning consistently
- **State Synchronization**: Ensure all component state changes are properly synchronized
- **Transition Management**: Coordinate transitions between components to avoid layout jumps
- **Event Propagation**: Use a custom event system for cross-component communication
- **DOM Measurement Approach**: Use a consistent strategy for obtaining measurements (Refs over direct queries)
- **Viewport Adaptability**: Handle edge cases for different viewport sizes and orientations
- **Theme Transition Management**: Ensure smooth transitions between themes without layout shifts
- **Hydration Stability**: Design components to handle SSR/CSR differences gracefully
- **Nested Container Management**: Create clear guidelines for container nesting and inheritance
- **Scroll Behavior Standardization**: Define a single approach to scroll management across components
- **Breakpoint Consistency**: Use a standard set of breakpoints for responsive design
- **Touch Interaction Standards**: Define consistent touch targets and gesture responses

## Mobile-First Design Principles
- Start all component designs from mobile viewports first
- Use progressive enhancement to add features for larger screens
- Implement touch-friendly UI elements throughout
- Optimize for performance on mobile devices
- Design for variable network conditions
- Support offline functionality where appropriate
- Implement responsive typography system
- Use appropriate input types for forms on mobile
- Consider thumb reach zones in mobile layouts
- Design for portrait and landscape orientations
- Implement appropriate loading indicators for mobile networks
- Optimize animations for battery efficiency

## Documentation References
- [React 19 Official Release](fetch https://react.dev/blog/2024/12/05/react-19)
- [TailwindCSS v4 Documentation](fetch https://tailwindcss.com/blog/tailwindcss-v4)
- [shadcn UI with Tailwind v4](fetch https://ui.shadcn.com/docs/tailwind-v4#nextjs)
- [Next.js with TailwindCSS Integration](fetch https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [Next.js 15 App Router Documentation](fetch https://nextjs.org/docs/app)
- [OpenAPI Specification](fetch https://spec.openapis.org/oas/latest.html)
- [React Query Integration with OpenAPI](fetch https://tanstack.com/query/latest/docs/react/overview)

## Deliverable
A single comprehensive markdown file:
`.tasks/FRONTEND.md`(can be split into multiple numbered files if needed)

This file should contain:
- Component architecture for all three components (Sidebar, Chat Layout, Header)
- Implementation details with focus on resolving current issues
- Code examples demonstrating proper implementation patterns
- Usage guidelines for all components
- Test requirements covering all key functionality
- Performance considerations and optimization techniques
- Accessibility implementation notes
- Migration and parallel deployment strategy
- Mobile optimization strategies

No direct code modifications - only documentation and implementation guide in markdown format.