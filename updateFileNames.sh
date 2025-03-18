# #!/usr/bin/env bash

# SRC_DIR="./src"

# # 1) Rename *.js → *.jsx
# echo "1) Renaming all *.js files to *.jsx..."
# find "$SRC_DIR" -type f -name "*.js" | while read -r js_file; do
#   jsx_file="${js_file%.js}.jsx"
#   echo "  Renaming: $js_file → $jsx_file"
#   mv "$js_file" "$jsx_file"
# done

# # 2) Update any *.js → *.jsx imports in .js, .jsx, .ts, and .tsx files
# echo ""
# echo "2) Updating .js imports to .jsx in all relevant files..."
# find "$SRC_DIR" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
#   | while read -r file; do
#     echo "  Updating imports in: $file"

#     # Use two '-e' expressions to handle:
#     #    import something from "./foo.js"
#     #    import("./foo.js")
#     #
#     # The pattern (\.?\.?\/[^'\"]+) ensures we only replace local/relative imports,
#     # i.e. './foo.js' or '../someDir/foo.js'. 
#     #
#     # `-i '' -E` = in-place edit with extended regex on macOS (no backup file).
    
#     sed -i '' -E \
#       -e "s/(from[[:space:]]+['\"])(\.?\.?\/[^'\"]+)\.js(['\"])/\1\2.jsx\3/g" \
#       -e "s/(import[[:space:]]*\(['\"])(\.?\.?\/[^'\"]+)\.js(['\"])/\1\2.jsx\3/g" \
#       "$file"
# done

# echo ""
# echo "✅ Done! All .js files have been renamed to .jsx, and import statements updated."


#!/usr/bin/env bash

# Define the root directory for your source code
SRC_DIR="./src"

echo "Replacing 'process.env.' with 'import.meta.env.' in all relevant files under $SRC_DIR..."

# Recursively find all files that might contain your environment references
# Adjust the file extensions as needed (.js, .jsx, .ts, .tsx, etc.)
find "$SRC_DIR" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
  | while read -r file; do
    echo "  Updating environment references in: $file"
    # On macOS, use `sed -i '' -E`. 
    # The -i '' part does in-place editing without creating backups.
    # The -E part enables extended regular expressions.
    sed -i '' -E "s/process\.env\./import.meta.env./g" "$file"
done

echo "✅ Done! All occurrences of 'process.env.' have been replaced with 'import.meta.env.'."

