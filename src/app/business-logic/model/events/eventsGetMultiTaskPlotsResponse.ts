/**
 * events
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * OpenAPI spec version: 2.7
 *
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 */



export interface EventsGetMultiTaskPlotsResponse {
    /**
     * Plots mapping (keyed by task name)
     */
    plots?: object;
    /**
     * Number of results returned
     */
    returned?: number;
    /**
     * Total number of results available for this query
     */
    total?: number;
    /**
     * Scroll ID for getting more results
     */
    scroll_id?: string;
}
