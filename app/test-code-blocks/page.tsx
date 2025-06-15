import { Markdown } from "@/components/prompt-kit/markdown"

export default function TestCodeBlocks() {
  const testMarkdown = `
# Code Block Styling Test

Here are some test code blocks to verify the styling:

## Shell Commands

\`\`\`bash
# Check if autosuspend is disabled
cat /sys/module/usbcore/parameters/autosuspend
# Should return: -1

# Monitor USB events
tail -f /var/log/syslog | grep -i usb

# Check current USB devices
lsusb | grep -i corsair
\`\`\`

## Monitoring Script

\`\`\`bash
# Create monitoring script in go file
echo '#!/bin/bash'
# Monitor USB stability
if grep -q "USB disconnect" /var/log/syslog; then
    echo "$(date): USB disconnect detected" >> /var/log/usb_monitor.log
fi' > /boot/config/go

chmod +x /boot/config/go
\`\`\`

## Python Code

\`\`\`python
def test_function():
    return "Hello World"

print(test_function())
\`\`\`

## Inline code: \`npm install\` and \`git commit\`
`

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="prose dark:prose-invert max-w-none">
        <Markdown>{testMarkdown}</Markdown>
      </div>
    </div>
  )
} 