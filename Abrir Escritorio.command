#!/bin/bash
cd "$(dirname "$0")"
open "http://localhost:8000/Escritorio.html"
python3 -m http.server 8000
