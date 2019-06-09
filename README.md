# immuto ZIP 

#### An Immuto integration for ZIP files that enables blockchain-based data verification. 


## Usage
You may simply zip/unzip files by providing input and output directories. <br>
Creating ZIP files requires an Immuto account, but verification does not. <br> 
We recommend you register a development account for testing.<br>
<a href="(https://dev.immuto.io/register)">(https://dev.immuto.io/register)</a><br>

```
npm install -g izip
izip --zip input_folder_path output_zip_path [https://dev.immuto.io]
izip --unzip input_zip_path output_folder_path [https://dev.immuto.io]
```
The (optional) last parameter specifies use of the Immuto development environment in ZIP creation. If blank, the default environment is https://www.immuto.io.<br>
Input paths must exist. Output paths must not yet exist (to avoid overwriting existing data).

## Documentation
This library may be easily included in NodeJS applications. <br>
Complete documentation for such integration is coming soon. 
