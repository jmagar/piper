#!/usr/bin/env python3

import requests
import json
import sys
from rich.console import Console
from rich.progress import Progress

console = Console()


def test_llm_endpoint(
    message: str, endpoint: str = "http://localhost:4100/api/chat"
) -> None:
    """
    Test the LLM endpoint directly with a message
    """
    headers = {"Content-Type": "application/json"}

    payload = {
        "content": message,
        "userId": "test-user",
    }

    console.print(f"[yellow]Testing LLM endpoint with message:[/yellow] {message}")
    console.print(f"[yellow]Endpoint:[/yellow] {endpoint}")
    console.print(f"[yellow]Payload:[/yellow] {json.dumps(payload, indent=2)}")

    try:
        with Progress() as progress:
            task = progress.add_task("[cyan]Waiting for response...", total=None)

            # Make the request with stream=True to get chunks
            response = requests.post(
                endpoint, json=payload, headers=headers, stream=True
            )

            if response.status_code != 200:
                console.print(
                    f"[red]Error: Received status code {response.status_code}[/red]"
                )
                console.print(response.text)
                return

            console.print("\n[green]Response chunks:[/green]")

            # Process the streaming response
            full_response = ""
            for chunk in response.iter_lines():
                if chunk:
                    try:
                        # Decode the chunk and remove 'data: ' prefix if it exists
                        chunk_str = chunk.decode("utf-8")
                        if chunk_str.startswith("data: "):
                            chunk_str = chunk_str[6:]

                        # Try to parse as JSON
                        chunk_data = json.loads(chunk_str)

                        # Accumulate the response and print
                        if "content" in chunk_data:
                            content = chunk_data["content"]
                            full_response += content
                            console.print(content, end="")
                        elif "error" in chunk_data:
                            console.print(
                                f"\n[red]Error in chunk:[/red] {chunk_data['error']}"
                            )
                    except json.JSONDecodeError:
                        # If it's not JSON, print the raw chunk
                        console.print(chunk_str)

            # Print the complete response at the end
            console.print("\n\n[green]Complete response:[/green]")
            console.print(full_response)
            console.print("\n[green]Response complete![/green]")

    except requests.exceptions.RequestException as e:
        console.print(f"[red]Error making request:[/red] {str(e)}")
    except Exception as e:
        console.print(f"[red]Unexpected error:[/red] {str(e)}")


if __name__ == "__main__":
    # Get message from command line args or use default
    message = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "What time is it?"
    test_llm_endpoint(message)
