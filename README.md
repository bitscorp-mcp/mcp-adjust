# MCP FFmpeg Video Processor

A Node.js server that uses FFmpeg to manipulate video files. This server provides APIs to:

- Resize videos to different resolutions (360p, 480p, 720p, 1080p)
- Extract audio from videos in various formats (MP3, AAC, WAV, OGG)

## Prerequisites

Before running this application, you need to have the following installed:

1. **Node.js** (v14 or higher)
2. **FFmpeg** - This is required for video processing

### Installing FFmpeg

#### On macOS:
```bash
brew install ffmpeg
```

#### On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install ffmpeg
```

#### On Windows:
1. Download FFmpeg from the [official website](https://ffmpeg.org/download.html)
2. Extract the files to a folder (e.g., `C:\ffmpeg`)
3. Add the `bin` folder to your PATH environment variable

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/mcp-ffmpeg.git
cd mcp-ffmpeg
```

2. Install dependencies:
```bash
npm install
```

## Running the Server

Start the server with:

```bash
npm start
```

For development with auto-restart on file changes:

```bash
npm run dev
```

## Using with Claude Desktop

This MCP FFmpeg server can be integrated with Claude Desktop to process videos through natural language requests.

### Running with npx

You can run the server directly with npx:

```bash
npx /path/to/mcp-ffmpeg
```

Or if you've published the package to npm:

```bash
npx mcp-ffmpeg
```

### Configuring Claude Desktop

To add this server to Claude Desktop, update your Claude Desktop configuration file:

1. Locate your Claude Desktop config file:
   - macOS: `~/.config/claude-desktop/config.json` or `~/Library/Application Support/Claude Desktop/config.json`
   - Windows: `%APPDATA%\Claude Desktop\config.json`
   - Linux: `~/.config/claude-desktop/config.json`

2. Add the FFmpeg MCP server to the `mcpServers` section:

```json
{
    "mcpServers": {
        "ffmpeg": {
            "command": "npx",
            "args": [
                "--yes",
                "/absolute/path/to/mcp-ffmpeg"
            ]
        }
    }
}
```

If you've published the package to npm:

```json
{
    "mcpServers": {
        "ffmpeg": {
            "command": "npx",
            "args": [
                "--yes",
                "mcp-ffmpeg"
            ]
        }
    }
}
```

3. Restart Claude Desktop for the changes to take effect.

### Example Prompts for Claude

Once configured, you can use prompts like:

```
Using the ffmpeg MCP server, please resize the video at /path/to/video.mp4 to 720p resolution.
```

## Notes

- Uploaded videos are stored temporarily in the `uploads` directory
- Processed videos and audio files are stored in the `output` directory
- The server has a file size limit of 500MB for uploads

## License

MIT