import os
import re
import ast
from typing import TypedDict, List, Dict, Any, Optional
from google import genai
from google.genai import types
from langgraph.graph import StateGraph, END
from app.ast_analyzer import analyze_code_vulnerabilities

# 1. State Schema Definition
class AgentState(TypedDict):
    original_code: str
    patched_code: str
    vulnerabilities: List[Dict[str, Any]]
    error_logs: List[str]
    iteration_count: int
    pipeline_step: str  # "scanning" | "analyzing" | "patching" | "validating" | "complete"
    history: List[Dict[str, Any]]  # List of {"iteration": int, "code": str, "error": str}
    compile_success: bool
    api_key: Optional[str]
    error_message: Optional[str]  # Global errors (like API keys, connectivity)

# Extract code blocks from LLM responses
def extract_python_code(llm_output: str) -> str:
    # Match ```python ... ```
    match = re.search(r"```python\s*(.*?)\s*```", llm_output, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    # Match ``` ... ```
    match = re.search(r"```\s*(.*?)\s*```", llm_output, re.DOTALL)
    if match:
        return match.group(1).strip()
    return llm_output.strip()

# Node 1: AST Scan & Analyze
async def ast_scan_node(state: AgentState) -> Dict[str, Any]:
    # Phase 1: Scanning
    # Phase 2: Analyzing
    vulns = analyze_code_vulnerabilities(state["original_code"])
    return {
        "vulnerabilities": vulns,
        "pipeline_step": "analyzing",
        "patched_code": state["original_code"] if not state.get("patched_code") else state["patched_code"]
    }

# Node 2: LLM Patching Agent
async def llm_patch_node(state: AgentState) -> Dict[str, Any]:
    api_key = state.get("api_key") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {
            "error_message": "Gemini API Key is missing. Please set the GEMINI_API_KEY environment variable or supply it in the configurations panel.",
            "pipeline_step": "complete"
        }
        
    try:
        # Format vulnerability descriptions for the prompt
        vuln_descriptions = []
        for v in state["vulnerabilities"]:
            vuln_descriptions.append(
                f"- Line {v['line']}: Type: {v['type']} (Severity: {v['severity']})\n  Description: {v['description']}\n  Code: `{v['node_content']}`"
            )
        
        vulns_text = "\n".join(vuln_descriptions) if vuln_descriptions else "No specific security issues flagged by AST scan, but review for security best practices."
        
        # Build prompt
        prompt = f"""You are an expert security engineer and Python developer.
Your task is to fix security vulnerabilities in the provided Python code.

### Original Code:
```python
{state["original_code"]}
```

### Identified Vulnerabilities:
{vulns_text}

### Instructions:
1. Remediate ALL vulnerabilities mentioned above (e.g. replace eval with safe parser, fix SQL injection with parameterized queries, fix command injection, remove hardcoded secrets).
2. Ensure the code remains syntactically correct, runs, and preserves the original business logic.
3. Do NOT add unnecessary print statements or extra debug logs.
4. Respond ONLY with the complete, corrected Python code inside a markdown code block, i.e.:
```python
# code here
```
"""
        
        # If this is an iterative refinement (iteration_count > 0)
        if state["iteration_count"] > 0 and state["error_logs"]:
            last_error = state["error_logs"][-1]
            last_code = state["patched_code"]
            prompt += f"""

### ATTENTION: PREVIOUS ATTEMPT HAD COMPILER/SYNTAX ERRORS.
Your last patch failed native Python compilation check.

### Code with compilation issues:
```python
{last_code}
```

### Native Python Compiler Error:
{last_error}

Please correct the syntax error above while preserving the security fixes. Output the full correct code.
"""

        # Call Gemini Client using the official google-genai client
        # Fallback simulation if the key is demo/dummy/missing
        is_demo_key = not api_key or len(api_key) < 10 or api_key.startswith("AIzaSyDUMMY") or "DUMMY" in api_key.upper()
        
        if is_demo_key:
            # Analyze original code to identify which template is active and apply mock patching logic
            orig = state["original_code"]
            patched_code = orig
            
            # Scenario A: SQL Injection Template
            if "get_user_records" in orig:
                patched_code = """import sqlite3

def get_user_records(db_path: str, username: str):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    # FIXED: Use parameterized query instead of f-string formatting
    query = "SELECT * FROM users WHERE username = ?"
    cursor.execute(query, (username,))
    return cursor.fetchall()"""
            
            # Scenario B: Command Injection Template
            elif "ping_server" in orig:
                patched_code = """import subprocess
import shlex

def ping_server(ip_address: str):
    # FIXED: Pass arguments as a list and disable shell execution (shell=False) to prevent injection
    command = ["ping", "-c", "1", ip_address]
    result = subprocess.run(command, shell=False, capture_output=True, text=True)
    return result.stdout"""
            
            # Scenario C: Hardcoded Secret Template
            elif "STRIPE_API_KEY" in orig:
                patched_code = """import stripe
import os

# FIXED: Retrieve credential securely from environment variable
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "default_secret_placeholder")

def charge_customer(amount: int, token: str):
    stripe.api_key = STRIPE_API_KEY
    charge = stripe.Charge.create(
        amount=amount,
        currency="usd",
        source=token,
        description="Service Charge"
    )
    return charge.id"""
            
            # Scenario D: Syntax Error + Command Injection Self-Healing Demo
            elif "scan_network_hosts" in orig:
                # In iteration 0, return code containing a syntax error to trigger the compiler loop
                if state["iteration_count"] == 0:
                    patched_code = """import subprocess

def scan_network_hosts(host_ip: str):
    # FIXED: Replaced unsafe os.system with safe subprocess list
    # SYNTAX ERROR: Intentional missing parenthesis in print statement on iteration 1 to demonstrate loop
    print(f"Scanning target host: {host_ip}"
    subprocess.run(["nmap", "-sV", host_ip], shell=False)
"""
                else:
                    # In iteration 1 or 2, correct the syntax error based on compilation log feedback
                    patched_code = """import subprocess

def scan_network_hosts(host_ip: str):
    # FIXED: Replaced unsafe os.system with safe subprocess list
    # REFINED: Restored missing parenthesis to solve compiler SyntaxError
    print(f"Scanning target host: {host_ip}")
    subprocess.run(["nmap", "-sV", host_ip], shell=False)
"""
            
            return {
                "patched_code": patched_code,
                "iteration_count": state["iteration_count"] + 1,
                "pipeline_step": "patching"
            }
            
        client = genai.Client(api_key=api_key)
        
        # We will use gemini-2.5-flash as default high-performing model
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        patched_raw = response.text or ""
        patched_code = extract_python_code(patched_raw)
        
        return {
            "patched_code": patched_code,
            "iteration_count": state["iteration_count"] + 1,
            "pipeline_step": "patching"
        }
    except Exception as e:
        return {
            "error_message": f"Gemini API Error: {str(e)}",
            "pipeline_step": "complete"
        }

# Node 3: Compiler Validation Node
async def validate_code_node(state: AgentState) -> Dict[str, Any]:
    if state.get("error_message"):
        return {"compile_success": False, "pipeline_step": "complete"}
        
    patched_code = state["patched_code"]
    
    try:
        # Use python's native compile() function to validate syntax
        compile(patched_code, "<string>", "exec")
        return {
            "compile_success": True,
            "pipeline_step": "complete"
        }
    except SyntaxError as e:
        # Fetch the failing lines context if possible
        code_lines = patched_code.splitlines()
        failing_line = code_lines[e.lineno - 1] if e.lineno and 0 < e.lineno <= len(code_lines) else ""
        
        error_msg = f"SyntaxError: {e.msg} on line {e.lineno}, col {e.offset}.\nFailing Code Line: {failing_line}"
        
        new_history = list(state.get("history") or [])
        new_history.append({
            "iteration": state["iteration_count"],
            "code": patched_code,
            "error": error_msg
        })
        
        new_error_logs = list(state.get("error_logs") or [])
        new_error_logs.append(error_msg)
        
        return {
            "compile_success": False,
            "error_logs": new_error_logs,
            "history": new_history,
            "pipeline_step": "validating"
        }

# Node 4: Finalize Node (Terminal node setup)
async def finalize_node(state: AgentState) -> Dict[str, Any]:
    return {
        "pipeline_step": "complete"
    }

# Conditional Routing Logic
def route_after_validation(state: AgentState):
    if state.get("error_message"):
        return END
        
    if state.get("compile_success", False):
        return "finalize"
        
    # Cap at exactly 3 iterations
    if state.get("iteration_count", 0) >= 3:
        return "finalize"
        
    # If compilation failed and we have iterations left, loop back to patching
    return "llm_patch"

# LangGraph Build
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("ast_scan", ast_scan_node)
workflow.add_node("llm_patch", llm_patch_node)
workflow.add_node("validate_code", validate_code_node)
workflow.add_node("finalize", finalize_node)

# Set Entry & Edges
workflow.set_entry_point("ast_scan")
workflow.add_edge("ast_scan", "llm_patch")
workflow.add_edge("llm_patch", "validate_code")

# Add Conditional Edges
workflow.add_conditional_edges(
    "validate_code",
    route_after_validation,
    {
        "finalize": "finalize",
        "llm_patch": "llm_patch",
        END: END
    }
)
workflow.add_edge("finalize", END)

# Compile Graph
remediation_graph = workflow.compile()
