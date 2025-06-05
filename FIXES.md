OK. Examine the first attached image. 
It says claude sonnet 4(THIS IS A REAL MODEL, DO NOT QUESTION ME ON THIS) does not support tools, even though it definitely does.

I cannot click the x button for the attached agent to remove it from the message.(2nd attached image)
We need to wire up the URL modal to the backend to fetch(we should be using the fetch tool from the fetch MCP server for this) the contents of the URL to attached.

When I create a new agent it says 404 - Page not found, as you can see in the 3rd image, also note in the 3rd image, its using /a/, when it should be /agents/, as you can see in the 4th image. IT DOES CREATE THE AGENT STILL THOUGH, so we just need to fix the URL it's forwarding to after it creates the agent.

Examine the 5th image. I want you to remove the Tools section (and any Exa related code) from the agent creation modal. In it's place I want you to add a dropdown to select a prompt(s) to attach to the agent.

Examine the 6th attached image -- I need you to make it so that I dont have to click the down arrow, but anywhere on that row for the dropdown to come down.

In the 7th attached image, you can see a small 3 dot menu located under the Profile dropdown, lets move this to a better, more visible/logical location.

In the 8th image, it shows the edit prompt modal/dialog, I want you to add our enhance prompt button to this modal/dialog. (same with create prompt modal/dialog)