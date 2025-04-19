
import { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand, ListDataCatalogsCommand, ListDatabasesCommand } from "@aws-sdk/client-athena";

const athenaClient = new AthenaClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function executeAthenaQuery(query: string) {
  try {

    const catalogs = await athenaClient.send(new ListDataCatalogsCommand({}));
    console.log("Catalogs:", catalogs);

    const tables = await athenaClient.send(new ListDatabasesCommand({
      CatalogName: `yousuf_demo_s3table_catalog`
    }));
    console.log("Tables:", tables);
    
    // Start query execution
    const startQueryResponse = await athenaClient.send(new StartQueryExecutionCommand({
      QueryString: query,
      QueryExecutionContext: { 
        Database: 'aws_s3_metadata', 
        Catalog: `yousuf_demo_s3table_catalog`
      },
      ResultConfiguration: {
        OutputLocation: `s3://yousufgenerals3bucket/results/`
      }
    }));

    const queryExecutionId = startQueryResponse.QueryExecutionId;
    
    // Wait for query to complete
    let queryStatus = 'RUNNING';
    while (queryStatus === 'RUNNING' || queryStatus === 'QUEUED') {
      const queryExecution = await athenaClient.send(new GetQueryExecutionCommand({
        QueryExecutionId: queryExecutionId
      }));
      queryStatus = queryExecution.QueryExecution?.Status?.State || '';
      if (queryStatus === 'FAILED') {
        throw new Error(queryExecution.QueryExecution?.Status?.StateChangeReason);
      }
      if (queryStatus === 'RUNNING' || queryStatus === 'QUEUED') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Get results
    const results = await athenaClient.send(new GetQueryResultsCommand({
      QueryExecutionId: queryExecutionId
    }));

    return results.ResultSet?.Rows;
  } catch (error) {
    console.error('Error executing Athena query:', error);
    throw error;
  }
}
