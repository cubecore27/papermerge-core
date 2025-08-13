import boto3

# Configure S3 client
s3 = boto3.client(
    's3',
    endpoint_url='https://bucket-production-7efb.up.railway.app',
    aws_access_key_id='Liq9eRvTljXMPP1vUamZ',
    aws_secret_access_key='LKhgSTxmSnKG9xrYJrK1aNfMUIkTl90ZTD7eXmd6',
    region_name='us-east-1',
    config=boto3.session.Config(s3={'addressing_style': 'path'}, signature_version='s3v4')
)

# Test connection by listing buckets
try:
    response = s3.list_buckets()
    print("S3 Connection Successful!")
    print("Buckets:")
    for bucket in response['Buckets']:
        print(f"  {bucket['Name']}")
        
    # Try to list objects in your specific bucket
    try:
        objects = s3.list_objects_v2(Bucket='papermerge-docs')
        print("\nObjects in papermerge-docs:")
        if 'Contents' in objects:
            for obj in objects['Contents']:
                print(f"  {obj['Key']}")
        else:
            print("  Bucket is empty")
    except Exception as e:
        print(f"Error listing objects: {e}")
        
except Exception as e:
    print(f"S3 Connection Failed: {e}")