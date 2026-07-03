import sys
import os
import asyncio

# Add the current directory to python path to import app module
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.ast_analyzer import analyze_code_vulnerabilities
from app.remediation_graph import remediation_graph

# Sample vulnerable Python snippet
vulnerable_code = """
import os
import sqlite3
import pickle

def unsafe_operations(user_input):
    # Eval issue
    eval(user_input)
    
    # SQL Injection issue
    conn = sqlite3.connect('test.db')
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM users WHERE name = '{user_input}'")
    
    # Command Injection issue
    os.system("ping " + user_input)
    
    # Insecure Deserialization
    pickle.loads(user_input)
    
    # Hardcoded Secrets
    API_KEY = "super_secret_token_12345"
    
    return True
"""

def test_ast_scan():
    print("--- Testing AST Security Scanning ---")
    vulnerabilities = analyze_code_vulnerabilities(vulnerable_code)
    print(f"Scanned and found {len(vulnerabilities)} vulnerabilities:")
    for v in vulnerabilities:
        print(f"[{v['severity']}] {v['type']} on line {v['line']}: {v['description']}")
        print(f"  Line: {v['node_content']}")
    
    # We should have found: eval_exec, sql_injection, command_injection, insecure_deserialization, hardcoded_secret
    vuln_types = [v['type'] for v in vulnerabilities]
    assert "eval_exec" in vuln_types, "eval_exec should be detected"
    assert "sql_injection" in vuln_types, "sql_injection should be detected"
    assert "command_injection" in vuln_types, "command_injection should be detected"
    assert "insecure_deserialization" in vuln_types, "insecure_deserialization should be detected"
    assert "hardcoded_secret" in vuln_types, "hardcoded_secret should be detected"
    print("AST Scanner Test: SUCCESS\n")

def test_graph_compile():
    print("--- Testing LangGraph Pipeline Compilation ---")
    assert remediation_graph is not None
    print("LangGraph Compilation Test: SUCCESS\n")

if __name__ == "__main__":
    test_ast_scan()
    test_graph_compile()
    print("All backend checks passed successfully!")
