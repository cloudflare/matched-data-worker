# Matched Data JS

## Logpush Setup

1. Dataset:
   - Firewall Events
2. Select Data Fields:
   - Required: General > Metadata
   - any others are optional
3. Select Destination:
   - S3 Compatible
4. Enter Desination Info (see example below):
   - given the final url you want to use is <subdomain>.<example.com>/logs
   - where <subdomain>, <example.com> are arbitrary, "logs" is required for default configuration of worker
   - _S3 Compatible Bucket Path_: <subdomain>/logs
   - _Endpoint URL_: <example.com>
   - all other fields can be aribrary values

### Logpush Setup Example

![destination-example.png](destination-example.png)

## Configuration and Deploy

1. edit wrangler.toml to add `DOMAIN` and `SUBDOMAIN` and `ACCOUNTID`
2. edit src/index.tsL37 to send the decoded data anywhere you'd like.
3. `npx wrangler secret put MATCHED_PAYLOAD_PRIVATE_KEY`
   - enter the private key generated when deploying a matched payload
   - see [documentation](https://developers.cloudflare.com/waf/managed-rules/payload-logging/) for generating the private public key pair
4. `npm run deploy`

# Matched Payload Format

The matched data payload is base64 encoded, and then binary encoded using the following format:

```
[version: 1 byte][encapped key: 32 bytes][payload size: 8 bytes][payload: N bytes]
```

## Local testing

1. `echo 'MATCHED_PAYLOAD_PRIVATE_KEY=uBS5eBttHrqkdY41kbZPdvYnNz8Vj0TvKIUpjB1y/GA=' > .dev.vars`
   - taken from https://github.com/cloudflare/matched-data-cli
2. window 1: `npm run dev`
3. window 2: `npm run req`
4. window 1: should see `[ 'test matched data' ]`

### See Also

https://github.com/cloudflare/matched-data-cli