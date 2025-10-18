# Azure App Service Deployment Setup Guide

This guide will help you set up CI/CD deployment to Azure App Service for the Avy I backend.

## Prerequisites

1. **Azure Account** with an active subscription
2. **Docker Hub Account** for container registry
3. **GitHub Repository** with the Avy I code

## Step 1: Complete CLI-Based Azure Deployment

### 1.1 Login to Azure CLI
```bash
# Login to Azure (this will open a browser for authentication)
az login

# Verify your subscription
az account show

# If you have multiple subscriptions, set the correct one
# az account set --subscription "your-subscription-id"
```

### 1.2 Create Resource Group in Central India
```bash
# Create resource group in Central India region
az group create \
  --name avyi-rg \
  --location "Central India" \
  --tags project="avyi" environment="production"

# Verify resource group creation
az group show --name avyi-rg --output table
```

### 1.3 Create App Service Plan (B1 Linux)
```bash
# Create B1 Linux App Service Plan in Central India
az appservice plan create \
  --name avyi-plan \
  --resource-group avyi-rg \
  --location "Central India" \
  --sku B1 \
  --is-linux \
  --tags project="avyi" environment="production"

# Verify App Service Plan creation
az appservice plan show \
  --name avyi-plan \
  --resource-group avyi-rg \
  --output table
```

### 1.4 Create Web App with Container
```bash
# Create Web App with Docker container support
az webapp create \
  --resource-group avyi-rg \
  --plan avyi-plan \
  --name avyi-server \
  --deployment-container-image-name chiranjeevichetan/avyi-app:latest \
  --tags project="avyi" environment="production"

# Verify Web App creation
az webapp show \
  --name avyi-server \
  --resource-group avyi-rg \
  --output table
```

### 1.5 Configure Container and App Settings
```bash
# Enable container logging
az webapp log config \
  --resource-group avyi-rg \
  --name avyi-server \
  --docker-container-logging filesystem \
  --level information

# Configure basic app settings
az webapp config appsettings set \
  --resource-group avyi-rg \
  --name avyi-server \
  --settings \
    WEBSITES_PORT=8080 \
    WEBSITES_ENABLE_APP_SERVICE_STORAGE=false \
    DOCKER_REGISTRY_SERVER_URL=https://index.docker.io \
    NODE_ENV=production \
    PORT=8080

# Configure container settings
az webapp config container set \
  --resource-group avyi-rg \
  --name avyi-server \
  --docker-custom-image-name chiranjeevichetan/avyi-app:latest \
  --docker-registry-server-url https://index.docker.io

# Enable HTTPS only
az webapp update \
  --resource-group avyi-rg \
  --name avyi-server \
  --https-only true
```

### 1.6 Configure Environment Variables
```bash
# Set all required environment variables
az webapp config appsettings set \
  --resource-group avyi-rg \
  --name avyi-server \
  --settings \
    DATABASE_URL="postgres://avnadmin:AVNS_PbG7CkNTLnYPvkD-aTz@avy-tracker-avyrentechnologies-2025.c.aivencloud.com:10887/avy-i?sslmode=require" \
    JWT_SECRET="d77667a13f872c7c26316f4d42cbc276a4c5ff197fd1a3ec087811b767a42537bdb3798db50c902f3d440ccec5f1b91d5c42a2ce8f404b01b3de05b4ee5174e3" \
    JWT_EXPIRES_IN="1d" \
    FRONTEND_URL="192.168.0.104" \
    SCADA_POLL_INTERVAL="30000" \
    RATE_LIMIT_WINDOW_MS="900000" \
    RATE_LIMIT_MAX="100"

# Verify environment variables are set
az webapp config appsettings list \
  --resource-group avyi-rg \
  --name avyi-server \
  --output table
```

### 1.7 Configure Deployment and Scaling
```bash
# Configure deployment source (for CI/CD)
az webapp deployment source config \
  --resource-group avyi-rg \
  --name avyi-server \
  --repo-url https://github.com/your-username/Avy-Notifier \
  --branch main \
  --manual-integration

# Configure auto-scaling (optional)
az monitor autoscale create \
  --resource-group avyi-rg \
  --resource avyi-server \
  --resource-type Microsoft.Web/sites \
  --name avyi-autoscale \
  --min-count 1 \
  --max-count 3 \
  --count 1

# Add CPU-based scaling rule
az monitor autoscale rule create \
  --resource-group avyi-rg \
  --autoscale-name avyi-autoscale \
  --condition "Percentage CPU > 70 avg 5m" \
  --scale out 1
```

### 1.8 Configure Health Check and Monitoring
```bash
# Configure health check
az webapp config set \
  --resource-group avyi-rg \
  --name avyi-server \
  --health-check-path "/health"

# Enable Application Insights (optional but recommended)
az extension add --name application-insights

# Create Application Insights instance
az monitor app-insights component create \
  --app avyi-insights \
  --location "Central India" \
  --resource-group avyi-rg \
  --application-type web

# Get Application Insights instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app avyi-insights \
  --resource-group avyi-rg \
  --query instrumentationKey \
  --output tsv)

# Configure Application Insights
az webapp config appsettings set \
  --resource-group avyi-rg \
  --name avyi-server \
  --settings \
    APPINSIGHTS_INSTRUMENTATIONKEY="$INSTRUMENTATION_KEY" \
    APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=$INSTRUMENTATION_KEY"
```

### 1.9 Configure Custom Domain (Optional)
```bash
# If you have a custom domain, configure it
# Replace 'your-domain.com' with your actual domain

# Add custom domain
az webapp config hostname add \
  --resource-group avyi-rg \
  --webapp-name avyi-server \
  --hostname your-domain.com

# Create and bind SSL certificate (for custom domain)
az webapp config ssl create \
  --resource-group avyi-rg \
  --name avyi-server \
  --hostname your-domain.com

# Enable HTTPS redirect
az webapp config set \
  --resource-group avyi-rg \
  --name avyi-server \
  --https-only true
```

### 1.10 Verify Deployment
```bash
# Check deployment status
az webapp show \
  --resource-group avyi-rg \
  --name avyi-server \
  --query "{name:name,state:state,defaultHostName:defaultHostName,httpsOnly:httpsOnly}" \
  --output table

# Test the health endpoint
curl -f https://avyi-server.azurewebsites.net/health

# Check application logs
az webapp log tail \
  --resource-group avyi-rg \
  --name avyi-server

# Get deployment URL
echo "Your Avy I backend is deployed at: https://avyi-server.azurewebsites.net"
echo "Health check: https://avyi-server.azurewebsites.net/health"
echo "API base URL: https://avyi-server.azurewebsites.net/api"
```

### 1.11 Resource Summary and Costs
```bash
# List all resources in the resource group
az resource list \
  --resource-group avyi-rg \
  --output table

# Check estimated costs (requires billing reader role)
az consumption usage list \
  --start-date $(date -d "1 month ago" +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d) \
  --output table

# Get resource group location and details
az group show \
  --name avyi-rg \
  --query "{name:name,location:location,tags:tags}" \
  --output table
```

## Expected Costs for Central India B1 Plan:
- **B1 Basic Plan**: ₹1,000-1,200/month (~$12-15/month)
- **Application Insights**: ₹200-500/month (~$2-6/month) for basic usage
- **Total Estimated**: ₹1,200-1,700/month (~$14-21/month)

## Step 2: Get Publish Profile

### Option A: Azure Portal
1. Go to Azure Portal → App Services → avyi-server
2. Click "Get publish profile" in the Overview section
3. Download the `.publishsettings` file
4. Copy the entire content of this file

### Option B: Azure CLI
```bash
az webapp deployment list-publishing-profiles \
  --resource-group avyi-rg \
  --name avyi-server \
  --xml
```

## Step 3: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

### Required Secrets:

1. **DOCKER_USERNAME** - Your Docker Hub username
2. **DOCKER_PASSWORD** - Your Docker Hub password or access token
3. **AZURE_WEBAPP_PUBLISH_PROFILE** - The publish profile content from Step 2
4. **AZURE_RESOURCE_GROUP** - `avyi-rg` (or your resource group name)

### Environment Variables (from your .env file):

5. **DATABASE_URL** - Your PostgreSQL connection string
6. **JWT_SECRET** - Your JWT secret key
7. **JWT_EXPIRES_IN** - JWT expiration time (e.g., "1d")
8. **FRONTEND_URL** - Your frontend URL
9. **SCADA_POLL_INTERVAL** - SCADA polling interval (e.g., "30000")
10. **RATE_LIMIT_WINDOW_MS** - Rate limiting window (e.g., "900000")
11. **RATE_LIMIT_MAX** - Rate limiting max requests (e.g., "100")

## Step 4: Update Your Environment Variables

### Current values from your .env:
```env
DATABASE_URL=postgres://avnadmin:AVNS_PbG7CkNTLnYPvkD-aTz@avy-tracker-avyrentechnologies-2025.c.aivencloud.com:10887/avy-i?sslmode=require
JWT_SECRET=d77667a13f872c7c26316f4d42cbc276a4c5ff197fd1a3ec087811b767a42537bdb3798db50c902f3d440ccec5f1b91d5c42a2ce8f404b01b3de05b4ee5174e3
JWT_EXPIRES_IN=1d
FRONTEND_URL=192.168.0.104
SCADA_POLL_INTERVAL=30000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

**Note:** Update `FRONTEND_URL` to your actual production frontend URL when deploying.

## Step 5: Deploy

1. **Push to main branch** - The workflow will trigger automatically when you push changes to the `backend/` directory
2. **Monitor deployment** - Check the Actions tab in your GitHub repository
3. **Verify deployment** - Visit `https://avyi-server.azurewebsites.net/health`

## Step 6: Configure Custom Domain (Optional)

If you want to use a custom domain:

```bash
# Add custom domain
az webapp config hostname add \
  --resource-group avyi-rg \
  --webapp-name avyi-server \
  --hostname your-domain.com

# Enable HTTPS
az webapp config ssl bind \
  --resource-group avyi-rg \
  --name avyi-server \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

## Troubleshooting

### Check Application Status
```bash
# Check overall app status
az webapp show \
  --resource-group avyi-rg \
  --name avyi-server \
  --query "{name:name,state:state,availabilityState:availabilityState,defaultHostName:defaultHostName}" \
  --output table

# Check app service plan status
az appservice plan show \
  --name avyi-plan \
  --resource-group avyi-rg \
  --query "{name:name,status:status,numberOfSites:numberOfSites,location:location}" \
  --output table
```

### Check Application Logs
```bash
# Stream live logs
az webapp log tail \
  --resource-group avyi-rg \
  --name avyi-server

# Download log files
az webapp log download \
  --resource-group avyi-rg \
  --name avyi-server \
  --log-file logs.zip

# Check specific log types
az webapp log show \
  --resource-group avyi-rg \
  --name avyi-server
```

### Check Container Status
```bash
# Check container configuration
az webapp config container show \
  --resource-group avyi-rg \
  --name avyi-server

# Check container logs specifically
az webapp log config \
  --resource-group avyi-rg \
  --name avyi-server \
  --docker-container-logging filesystem

# View container startup logs
az webapp log tail \
  --resource-group avyi-rg \
  --name avyi-server \
  --provider docker
```

### Performance and Health Checks
```bash
# Test health endpoint
curl -v https://avyi-server.azurewebsites.net/health

# Check response time and availability
curl -w "@curl-format.txt" -o /dev/null -s https://avyi-server.azurewebsites.net/health

# Create curl format file for detailed timing
cat > curl-format.txt << 'EOF'
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
EOF
```

### Restart and Reset Operations
```bash
# Restart the web app
az webapp restart \
  --resource-group avyi-rg \
  --name avyi-server

# Stop the web app
az webapp stop \
  --resource-group avyi-rg \
  --name avyi-server

# Start the web app
az webapp start \
  --resource-group avyi-rg \
  --name avyi-server

# Reset app service (if needed)
az webapp deployment source delete \
  --resource-group avyi-rg \
  --name avyi-server
```

### Database Connection Issues
```bash
# Test database connectivity from your local machine
psql "postgres://avnadmin:AVNS_PbG7CkNTLnYPvkD-aTz@avy-tracker-avyrentechnologies-2025.c.aivencloud.com:10887/avy-i?sslmode=require" -c "SELECT version();"

# Check if database URL is correctly set in app settings
az webapp config appsettings list \
  --resource-group avyi-rg \
  --name avyi-server \
  --query "[?name=='DATABASE_URL']" \
  --output table
```

### Central India Specific Issues
```bash
# Check if resources are in correct region
az resource list \
  --resource-group avyi-rg \
  --query "[].{name:name,type:type,location:location}" \
  --output table

# Check network latency to Central India
ping avyi-server.azurewebsites.net

# Verify region-specific settings
az webapp show \
  --resource-group avyi-rg \
  --name avyi-server \
  --query "{name:name,location:location,kind:kind}" \
  --output table
```

### Manual Environment Variable Configuration
If the automated configuration fails, you can set them manually:

```bash
az webapp config appsettings set \
  --resource-group avyi-rg \
  --name avyi-server \
  --settings \
    DATABASE_URL="your-database-url" \
    JWT_SECRET="your-jwt-secret" \
    JWT_EXPIRES_IN="1d" \
    FRONTEND_URL="your-frontend-url" \
    SCADA_POLL_INTERVAL="30000" \
    RATE_LIMIT_WINDOW_MS="900000" \
    RATE_LIMIT_MAX="100" \
    NODE_ENV="production" \
    PORT="8080" \
    WEBSITES_PORT="8080"
```

## Health Check Endpoints

- **Health Check**: `https://avyi-server.azurewebsites.net/health`
- **API Base**: `https://avyi-server.azurewebsites.net/api`

## Cost Optimization

- **B1 Basic Plan**: ~$13/month - Good for development/testing
- **S1 Standard Plan**: ~$56/month - Recommended for production
- **P1V2 Premium Plan**: ~$73/month - High performance production

You can scale up/down as needed:
```bash
az appservice plan update \
  --resource-group avyi-rg \
  --name avyi-plan \
  --sku S1
```

## Monitoring and Maintenance

### Set Up Monitoring Alerts
```bash
# Create action group for notifications
az monitor action-group create \
  --resource-group avyi-rg \
  --name avyi-alerts \
  --short-name avyi-alert

# Add email notification to action group
az monitor action-group update \
  --resource-group avyi-rg \
  --name avyi-alerts \
  --add-action email your-email@domain.com "Admin Email"

# Create CPU usage alert
az monitor metrics alert create \
  --resource-group avyi-rg \
  --name "High CPU Usage" \
  --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/avyi-rg/providers/Microsoft.Web/sites/avyi-server \
  --condition "avg Percentage CPU > 80" \
  --description "Alert when CPU usage is over 80%" \
  --evaluation-frequency 5m \
  --window-size 15m \
  --action avyi-alerts

# Create memory usage alert
az monitor metrics alert create \
  --resource-group avyi-rg \
  --name "High Memory Usage" \
  --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/avyi-rg/providers/Microsoft.Web/sites/avyi-server \
  --condition "avg MemoryPercentage > 85" \
  --description "Alert when memory usage is over 85%" \
  --evaluation-frequency 5m \
  --window-size 15m \
  --action avyi-alerts

# Create availability alert
az monitor metrics alert create \
  --resource-group avyi-rg \
  --name "App Availability" \
  --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/avyi-rg/providers/Microsoft.Web/sites/avyi-server \
  --condition "avg Http2xx < 1" \
  --description "Alert when app is not responding" \
  --evaluation-frequency 1m \
  --window-size 5m \
  --action avyi-alerts
```

### Regular Maintenance Commands
```bash
# Check app metrics
az monitor metrics list \
  --resource /subscriptions/$(az account show --query id -o tsv)/resourceGroups/avyi-rg/providers/Microsoft.Web/sites/avyi-server \
  --metric "CpuTime,Requests,MemoryWorkingSet" \
  --interval PT1H

# Update container image (for manual deployments)
az webapp config container set \
  --resource-group avyi-rg \
  --name avyi-server \
  --docker-custom-image-name chiranjeevichetan/avyi-app:latest

# Scale up during high traffic (temporary)
az appservice plan update \
  --resource-group avyi-rg \
  --name avyi-plan \
  --sku S1

# Scale back down to B1
az appservice plan update \
  --resource-group avyi-rg \
  --name avyi-plan \
  --sku B1

# Backup app settings
az webapp config appsettings list \
  --resource-group avyi-rg \
  --name avyi-server > avyi-app-settings-backup.json
```

### Central India Performance Optimization
```bash
# Enable local cache for better performance
az webapp config appsettings set \
  --resource-group avyi-rg \
  --name avyi-server \
  --settings WEBSITE_LOCAL_CACHE_OPTION=Always

# Configure session affinity for better performance
az webapp config set \
  --resource-group avyi-rg \
  --name avyi-server \
  --use-32bit-worker-process false

# Enable compression
az webapp config set \
  --resource-group avyi-rg \
  --name avyi-server \
  --http20-enabled true
```

## Security Considerations

1. **Environment Variables**: All sensitive data is stored as App Service settings (encrypted at rest)
2. **HTTPS**: Automatically enabled for *.azurewebsites.net domains
3. **Container Security**: Using non-root user in Docker container
4. **Network Security**: Consider adding IP restrictions if needed

### Additional Security Configuration
```bash
# Enable managed identity
az webapp identity assign \
  --resource-group avyi-rg \
  --name avyi-server

# Configure IP restrictions (example for specific IP ranges)
az webapp config access-restriction add \
  --resource-group avyi-rg \
  --name avyi-server \
  --rule-name "Allow India IPs" \
  --action Allow \
  --ip-address 103.0.0.0/8 \
  --priority 100

# Enable security headers
az webapp config appsettings set \
  --resource-group avyi-rg \
  --name avyi-server \
  --settings \
    WEBSITE_SECURITY_HEADERS_ENABLED=true \
    WEBSITE_HSTS_ENABLED=true
```

## Next Steps

1. Set up the GitHub secrets as described in Step 3
2. Push a change to the `backend/` directory to trigger the first deployment
3. Monitor the deployment in GitHub Actions
4. Test the deployed application at the health check endpoint
5. Update your mobile app's API configuration to point to the new Azure URL

The deployment will automatically handle:
- ✅ Building the Docker container
- ✅ Pushing to Docker Hub
- ✅ Deploying to Azure App Service
- ✅ Configuring environment variables
- ✅ Running health checks
- ✅ Database migrations via Prisma

## Quick Deployment Script

For convenience, here's a complete deployment script you can save and run:

```bash
#!/bin/bash
# deploy-avyi-azure.sh - Complete Avy I Azure Deployment Script

set -e  # Exit on any error

echo "🚀 Starting Avy I deployment to Azure (Central India)..."

# Variables
RESOURCE_GROUP="avyi-rg"
APP_SERVICE_PLAN="avyi-plan"
WEB_APP_NAME="avyi-server"
LOCATION="Central India"
SKU="B1"
DOCKER_IMAGE="chiranjeevichetan/avyi-app:latest"

# Step 1: Login and verify subscription
echo "📋 Logging into Azure..."
az login
az account show

# Step 2: Create resource group
echo "🏗️ Creating resource group in Central India..."
az group create \
  --name $RESOURCE_GROUP \
  --location "$LOCATION" \
  --tags project="avyi" environment="production"

# Step 3: Create App Service Plan
echo "📦 Creating B1 Linux App Service Plan..."
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --location "$LOCATION" \
  --sku $SKU \
  --is-linux

# Step 4: Create Web App
echo "🌐 Creating Web App with Docker container..."
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --name $WEB_APP_NAME \
  --deployment-container-image-name $DOCKER_IMAGE

# Step 5: Configure container settings
echo "⚙️ Configuring container settings..."
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --settings \
    WEBSITES_PORT=8080 \
    WEBSITES_ENABLE_APP_SERVICE_STORAGE=false \
    NODE_ENV=production \
    PORT=8080

# Step 6: Enable HTTPS and logging
echo "🔒 Enabling HTTPS and logging..."
az webapp update \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --https-only true

az webapp log config \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --docker-container-logging filesystem

# Step 7: Set environment variables
echo "🔧 Setting environment variables..."
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --settings \
    DATABASE_URL="postgres://avnadmin:AVNS_PbG7CkNTLnYPvkD-aTz@avy-tracker-avyrentechnologies-2025.c.aivencloud.com:10887/avy-i?sslmode=require" \
    JWT_SECRET="d77667a13f872c7c26316f4d42cbc276a4c5ff197fd1a3ec087811b767a42537bdb3798db50c902f3d440ccec5f1b91d5c42a2ce8f404b01b3de05b4ee5174e3" \
    JWT_EXPIRES_IN="1d" \
    FRONTEND_URL="192.168.0.104" \
    SCADA_POLL_INTERVAL="30000" \
    RATE_LIMIT_WINDOW_MS="900000" \
    RATE_LIMIT_MAX="100"

# Step 8: Configure health check
echo "🏥 Configuring health check..."
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --health-check-path "/health"

# Step 9: Verify deployment
echo "✅ Verifying deployment..."
az webapp show \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --query "{name:name,state:state,defaultHostName:defaultHostName}" \
  --output table

# Step 10: Test health endpoint
echo "🧪 Testing health endpoint..."
sleep 30  # Wait for app to start
curl -f https://$WEB_APP_NAME.azurewebsites.net/health || echo "Health check will be available shortly..."

echo ""
echo "🎉 Deployment completed successfully!"
echo "📍 Your Avy I backend is deployed at: https://$WEB_APP_NAME.azurewebsites.net"
echo "🏥 Health check: https://$WEB_APP_NAME.azurewebsites.net/health"
echo "🔗 API base URL: https://$WEB_APP_NAME.azurewebsites.net/api"
echo ""
echo "💰 Estimated monthly cost: ₹1,200-1,700 (~$14-21)"
echo "📊 Monitor your app: https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$WEB_APP_NAME"
```

### To use this script:
1. Save it as `deploy-avyi-azure.sh`
2. Make it executable: `chmod +x deploy-avyi-azure.sh`
3. Run it: `./deploy-avyi-azure.sh`

### Clean up script (if needed):
```bash
#!/bin/bash
# cleanup-avyi-azure.sh - Remove all Avy I resources

echo "🗑️ Cleaning up Avy I Azure resources..."
az group delete --name avyi-rg --yes --no-wait
echo "✅ Cleanup initiated. Resources will be deleted in the background."
```