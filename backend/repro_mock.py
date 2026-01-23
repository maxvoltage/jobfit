import sys
from unittest.mock import MagicMock

print(f"Python version: {sys.version}")

try:
    m = MagicMock()
    m.__iter__.return_value = [1]
    print("Trying iter(m) with return_value=[1]...")
    it = iter(m)
    print(f"Result: {list(it)}")
except Exception as e:
    print(f"Failed: {e}")

try:
    m2 = MagicMock()
    m2.__iter__.return_value = iter([1])
    print("\nTrying iter(m2) with return_value=iter([1])...")
    it2 = iter(m2)
    print(f"Result: {list(it2)}")
except Exception as e:
    print(f"Failed: {e}")
