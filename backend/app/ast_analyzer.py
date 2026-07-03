import ast
from typing import List, Dict, Any

class SecurityVisitor(ast.NodeVisitor):
    def __init__(self, code: str):
        self.code = code
        self.lines = code.splitlines()
        self.vulnerabilities = []

    def add_vuln(self, node: ast.AST, vuln_type: str, severity: str, desc: str):
        # Determine 1-based line number (handling fallback if lineno doesn't exist)
        lineno = getattr(node, "lineno", 1)
        col_offset = getattr(node, "col_offset", 0)
        
        node_content = ""
        if 0 < lineno <= len(self.lines):
            node_content = self.lines[lineno - 1].strip()
            
        self.vulnerabilities.append({
            "type": vuln_type,
            "severity": severity,
            "line": lineno,
            "col": col_offset,
            "description": desc,
            "node_content": node_content
        })

    def visit_Call(self, node: ast.Call):
        # 1. Check eval and exec
        if isinstance(node.func, ast.Name):
            if node.func.id in ("eval", "exec"):
                self.add_vuln(
                    node,
                    "eval_exec",
                    "CRITICAL",
                    f"Use of built-in '{node.func.id}' function is highly dangerous as it executes arbitrary code strings."
                )

        # 2. Check subprocess and os command execution
        # os.system, os.popen
        if isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name):
            if node.func.value.id == "os" and node.func.attr in ("system", "popen"):
                self.add_vuln(
                    node,
                    "command_injection",
                    "HIGH",
                    f"Use of 'os.{node.func.attr}' is vulnerable to command injection. Use the 'subprocess' module with args list instead."
                )
        
        # subprocess.run/Popen/etc with shell=True
        is_subprocess = False
        if isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name):
            if node.func.value.id == "subprocess" and node.func.attr in ("run", "Popen", "call", "check_output", "check_call"):
                is_subprocess = True
        elif isinstance(node.func, ast.Name):
            if node.func.id in ("run", "Popen", "call", "check_output", "check_call"):
                is_subprocess = True
                
        if is_subprocess:
            for kw in node.keywords:
                if kw.arg == "shell" and isinstance(kw.value, ast.Constant) and kw.value.value is True:
                    self.add_vuln(
                        node,
                        "command_injection",
                        "HIGH",
                        "Subprocess call with 'shell=True' enables shell expansion and exposes the application to command injection."
                    )

        # 3. Check Database query execution with string formatting (SQL Injection)
        if isinstance(node.func, ast.Attribute) and node.func.attr in ("execute", "executemany", "query"):
            if len(node.args) > 0:
                first_arg = node.args[0]
                is_unsafe = False
                desc = ""
                
                # Check for f-string (JoinedStr)
                if isinstance(first_arg, ast.JoinedStr):
                    is_unsafe = True
                    desc = f"SQL query constructed using f-string in '.{node.func.attr}()'. Use parameterized queries instead."
                # Check for string concatenation (BinOp with Add)
                elif isinstance(first_arg, ast.BinOp) and isinstance(first_arg.op, ast.Add):
                    is_unsafe = True
                    desc = f"SQL query constructed using string concatenation (+) in '.{node.func.attr}()'. Use parameterized queries instead."
                # Check for % formatting
                elif isinstance(first_arg, ast.BinOp) and isinstance(first_arg.op, ast.Mod):
                    is_unsafe = True
                    desc = f"SQL query constructed using string formatting (%) in '.{node.func.attr}()'. Use parameterized queries instead."
                # Check for .format() call
                elif isinstance(first_arg, ast.Call) and isinstance(first_arg.func, ast.Attribute) and first_arg.func.attr == "format":
                    is_unsafe = True
                    desc = f"SQL query constructed using '.format()' in '.{node.func.attr}()'. Use parameterized queries instead."

                if is_unsafe:
                    self.add_vuln(node, "sql_injection", "HIGH", desc)

        # 4. Insecure deserialization
        # pickle.loads, pickle.load
        if isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name):
            if node.func.value.id == "pickle" and node.func.attr in ("load", "loads"):
                self.add_vuln(
                    node,
                    "insecure_deserialization",
                    "HIGH",
                    "Use of 'pickle' for deserialization is insecure. It allows arbitrary code execution. Use JSON or safeyaml instead."
                )
            
            # yaml.unsafe_load, yaml.load
            if node.func.value.id == "yaml":
                if node.func.attr == "unsafe_load":
                    self.add_vuln(
                        node,
                        "insecure_deserialization",
                        "HIGH",
                        "Use of 'yaml.unsafe_load' is insecure. Use 'yaml.safe_load' instead."
                    )
                elif node.func.attr == "load":
                    has_safe_loader = False
                    for kw in node.keywords:
                        if kw.arg == "Loader":
                            if isinstance(kw.value, ast.Attribute) and kw.value.attr == "SafeLoader":
                                has_safe_loader = True
                            elif isinstance(kw.value, ast.Name) and kw.value.id == "SafeLoader":
                                has_safe_loader = True
                    if not has_safe_loader:
                        self.add_vuln(
                            node,
                            "insecure_deserialization",
                            "HIGH",
                            "Use of 'yaml.load' without 'SafeLoader' is insecure. Use 'yaml.safe_load' instead."
                        )

        # 5. Weak Cryptography
        if isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name):
            if node.func.value.id == "hashlib" and node.func.attr in ("md5", "sha1"):
                used_for_sec = True
                for kw in node.keywords:
                    if kw.arg == "usedforsecurity" and isinstance(kw.value, ast.Constant) and kw.value.value is False:
                        used_for_sec = False
                if used_for_sec:
                    self.add_vuln(
                        node,
                        "weak_crypto",
                        "MEDIUM",
                        f"Use of weak hash function 'hashlib.{node.func.attr}' for cryptographic hashing. Use SHA-256 or SHA-3 instead."
                    )
            
            if node.func.value.id == "tempfile" and node.func.attr == "mktemp":
                self.add_vuln(
                    node,
                    "weak_crypto",
                    "MEDIUM",
                    "Use of 'tempfile.mktemp' is deprecated and insecure (vulnerable to file creation race conditions). Use 'tempfile.mkstemp' instead."
                )

        self.generic_visit(node)

    def visit_Assign(self, node: ast.Assign):
        # 6. Hardcoded secrets
        for target in node.targets:
            if isinstance(target, ast.Name):
                name_lower = target.id.lower()
                is_secret_name = any(k in name_lower for k in ("secret", "password", "pwd", "api_key", "token", "auth_key"))
                if is_secret_name:
                    # check if value is a string literal
                    if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                        val = node.value.value
                        # ignore empty or placeholder values
                        if len(val) > 4 and not val.startswith(("<", "[", "{", "YOUR_")):
                            self.add_vuln(
                                node,
                                "hardcoded_secret",
                                "HIGH",
                                f"Hardcoded credential assigned to '{target.id}'. Move secrets to environment variables or config files."
                            )
        self.generic_visit(node)

def analyze_code_vulnerabilities(code: str) -> List[Dict[str, Any]]:
    """
    Parses code using standard ast, visits the nodes, and returns list of vulnerabilities.
    If code cannot be parsed (syntax error), returns an empty list, allowing the compiler loop
    or normal flow to report/handle compile errors.
    """
    try:
        tree = ast.parse(code)
    except Exception:
        # If the original code has compile errors, return empty vulnerabilities and let the validator catch it.
        return []
    
    visitor = SecurityVisitor(code)
    visitor.visit(tree)
    return visitor.vulnerabilities
