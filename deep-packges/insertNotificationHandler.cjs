const insertNotificationHandler = async ({deep, notificationPort, notificationRoute, portTypeId, routerListeningTypeId, routerTypeId, routerStringUseTypeId, routeTypeId, handleRouteTypeId, handlerTypeId, supportsId, containTypeId,  adminId, fileTypeId, handlerName}) => {
return await deep.insert(
    {
      type_id: portTypeId,
      number: {
        data: { value: notificationPort },
      },
      in: {
        data: {
          type_id: routerListeningTypeId,
          from: {
            data: {
              type_id: routerTypeId,
              in: {
                data: {
                  type_id: routerStringUseTypeId,
                  string: {
                    data: {
                      value:
                        notificationRoute,
                    },
                  },
                  from: {
                    data: {
                      type_id: routeTypeId,
                      out: {
                        data: {
                          type_id: handleRouteTypeId,
                          to: {
                            data: {
                              type_id: handlerTypeId,
                              from_id: supportsId,
                              in: {
                                data: {
                                  type_id: containTypeId,
                                  // from_id: deep.linkId,
                                  from_id: adminId,
                                  string: {
                                    data: {
                                      value: handlerName,
                                    },
                                  },
                                },
                              },
                              to: {
                                data: {
                                  type_id: fileTypeId,
                                  string: {
                                    data: {
                                      value: tinkoffNotificationHandlerCode,
                                    },
                                  },
                                  in: {
                                    data: {
                                      type_id: containTypeId,
                                      from_id: packageId,
                                      string: {
                                        data: {
                                          value: handlerName,
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      name: 'INSERT_HANDLE_ROUTE_HIERARCHICAL',
    }
  )

  if(error) {
    throw new Error(error.message);
  }
}

exports.insertNotificationHandler = insertNotificationHandler;