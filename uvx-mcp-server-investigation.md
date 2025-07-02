# Investigation: uvx MCP Servers Problems

## Executive Summary

This investigation reveals several critical issues affecting uvx-based MCP (Model Context Protocol) servers in your containerized environment. The problems range from Docker configuration issues to environment variable handling and system resource limitations.

## Key Findings

### 1. PATH and Installation Issues in Docker Containers

**Problem**: Executables installed via uvx are not found in the container's PATH, causing MCP servers to fail during startup.

**Root Cause**: 
- uvx installs binaries to non-standard locations that may not be in the container's PATH
- The project already implemented a workaround by moving binaries to `/usr/local/bin/`

**Evidence from codebase**:
```dockerfile
# Move uv binaries to proper bin directory
RUN mv /usr/local/uv /usr/local/bin/uv && \
    mv /usr/local/uvx /usr/local/bin/uvx
```

**Current Status**: ✅ **RESOLVED** - Your Dockerfile already addresses this issue

### 2. File Descriptor Exhaustion During Docker Builds

**Problem**: uvx can exhaust available file descriptors when compiling bytecode for large Python packages, causing build failures.

**Symptoms**:
- "No file descriptors available (os error 24)" errors
- Docker build failures during `uv sync` operations
- Particularly affects scientific computing packages (torch, flash-attn, etc.)

**Root Cause**: 
- uvx spawns multiple subprocesses for parallel compilation
- Each subprocess opens multiple files simultaneously
- Default Docker container limit is often 1024 file descriptors
- Large packages can easily exceed this limit

**Solutions**:
1. **Increase file descriptor limit temporarily**:
   ```dockerfile
   RUN sh -c "ulimit -n 4096 && uv sync --frozen"
   ```

2. **Disable bytecode compilation**:
   ```dockerfile
   ENV UV_COMPILE_BYTECODE=0
   ```

### 3. Environment Variable Propagation Issues

**Problem**: uvx may not properly propagate environment variables to the invoked MCP server processes.

**Impact**: 
- MCP servers fail to receive necessary configuration
- Authentication tokens, API keys, or connection strings may not be available
- Particularly problematic for servers requiring specific environment setup

**Evidence**: GitHub issue #6971 documents this problem on macOS

**Solutions**:
1. **Explicit environment passing in MCP configuration**:
   ```json
   {
     "command": "uvx",
     "args": ["mcp-server-package"],
     "env": {
       "API_KEY": "your-key",
       "CONFIG_PATH": "/config"
     }
   }
   ```

2. **Alternative: Direct package execution**:
   ```json
   {
     "command": "python",
     "args": ["-m", "mcp_server_package"],
     "env": {...}
   }
   ```

### 4. Python Version and Distribution Compatibility

**Problem**: uvx installation and execution can fail with certain Python versions and distributions.

**Affected Configurations**:
- Python < 3.10 on Debian-based distributions
- Systems where pip installs to `/usr/local/bin` but sysconfig points to `/usr/bin`

**Current Status**: ✅ **NOT APPLICABLE** - Your project uses Python 3.12 and handles installation correctly

### 5. Network and Docker Communication Issues

**Problem**: MCP servers running via uvx in Docker containers may have networking issues when communicating with other services.

**Your Specific Context**:
- Running on Unraid host system
- Container needs to communicate with host-based services
- Already resolved via host IP configuration (`10.1.0.2`)

**Current Status**: ✅ **RESOLVED** - Your learned memories document shows this is already addressed

## Specific Recommendations for Your Environment

### Immediate Actions

1. **Check Current uvx Accessibility**:
   ```bash
   docker exec your-container uvx --help
   ```

2. **Monitor File Descriptor Usage**:
   ```bash
   # During build, check if approaching limits
   ulimit -n
   ```

3. **Validate Environment Variable Passing**:
   Review MCP server configurations to ensure critical environment variables are explicitly passed

### Configuration Improvements

1. **Add File Descriptor Safety Margin**:
   ```dockerfile
   # In problematic build steps
   RUN sh -c "ulimit -n 4096 && uv sync --frozen"
   ```

2. **Explicit Environment Configuration**:
   ```json
   {
     "mcpServers": {
       "python-server": {
         "command": "uvx",
         "args": ["--from", "mcp-server-package", "server-command"],
         "env": {
           "PYTHONPATH": "/app",
           "CONFIG_DIR": "/config",
           "LOG_LEVEL": "info"
         }
       }
     }
   }
   ```

3. **Alternative Execution Method**:
   For problematic servers, consider direct Python execution:
   ```json
   {
     "command": "python",
     "args": ["-m", "pip", "install", "package", "&&", "python", "-m", "package"],
     "cwd": "/tmp"
   }
   ```

### Monitoring and Diagnostics

1. **Add Health Checks**:
   - Verify uvx is accessible: `which uvx`
   - Test MCP server startup: `uvx --from package server --test`
   - Check environment propagation: `uvx --from package env`

2. **Log Enhancement**:
   ```typescript
   // In MCP client factory
   logger.info(`[uvx MCP] Command: ${config.command}`, {
     args: config.args,
     env: Object.keys(config.env || {}),
     cwd: config.cwd
   });
   ```

## Risk Assessment

| Issue | Impact | Likelihood | Current Status |
|-------|--------|------------|----------------|
| PATH Issues | High | Low | ✅ Resolved |
| File Descriptor Exhaustion | High | Medium | ⚠️ Monitor |
| Environment Propagation | Medium | Medium | ⚠️ Review |
| Network Issues | Low | Low | ✅ Resolved |
| Python Compatibility | Low | Low | ✅ Not Applicable |

## Next Steps

1. **Immediate**: Test current uvx MCP servers to identify any failing instances
2. **Short-term**: Implement file descriptor monitoring and safety margins
3. **Medium-term**: Review and standardize environment variable handling
4. **Long-term**: Consider migration path if uvx issues persist

## Conclusion

Your environment has already addressed the most critical uvx issues through proper PATH configuration and Docker networking setup. The remaining risks are manageable through monitoring and configuration improvements. The file descriptor exhaustion issue is the most likely to impact your system and should be prioritized for monitoring and prevention.