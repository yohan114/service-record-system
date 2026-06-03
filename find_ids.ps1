$jsonFile = "d:\Yohan\Service record\vehicle_filter_data.js"
$content = Get-Content $jsonFile -Raw

# Extract just the DB_VEHICLES array
$content = $content -replace 'const DB_VEHICLES = ', ''
$content = $content -replace ';.*$', '' # Very crude, but let's just use regex

# Better way: just run a Node script
