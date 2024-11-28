exports.insertNotificationHandler = async (param) => {
  console.log('insertNotificationHandler', {param})
  const {deep, packageId,notificationPort, notificationRoute, portTypeLinkId, routerListeningTypeLinkId, routerTypeLinkId, routerStringUseTypeLinkId, routeTypeLinkId, handleRouteTypeLinkId, handlerTypeLinkId, supportsId, containTypeLinkId,  adminId, fileTypeLinkId, handlerName, code} = param;
  const insertData = {
    type_id: portTypeLinkId,
    number: {
      data: { value: notificationPort },
    },
    in: {
      data: [
        {
          type_id: routerListeningTypeLinkId,
          in: {
            data: {
              type_id: containTypeLinkId,
              from_id: packageId,
            },
          },
          from: {
            data: {
              type_id: routerTypeLinkId,
              in: {
                data: [
                  {
                    type_id: routerStringUseTypeLinkId,
                    in: {
                      data: {
                        type_id: containTypeLinkId,
                        from_id: packageId,
                        string: {
                          data: {
                            value: handlerName,
                          },
                        },
                      },
                    },
                    string: {
                      data: {
                        value:
                          notificationRoute,
                      },
                    },
                    from: {
                      data: {
                        type_id: routeTypeLinkId,
                        in: {
                          data: {
                            type_id: containTypeLinkId,
                            from_id: packageId,
                          },
                        },
                        out: {
                          data: {
                            type_id: handleRouteTypeLinkId,
                            in: {
                              data: [
                                {
                                type_id: containTypeLinkId,
                                from_id: packageId,
                              }
                            ]
                            },
                            to: {
                              data: {
                                type_id: handlerTypeLinkId,
                                from_id: supportsId,
                                in: {
                                  data: {
                                    type_id: containTypeLinkId,
                                    // from_id: deep.linkId,
                                    from_id: packageId,
                                    string: {
                                      data: {
                                        value: handlerName,
                                      },
                                    },
                                  },
                                },
                                to: {
                                  data: {
                                    type_id: fileTypeLinkId,
                                    string: {
                                      data: {
                                        value: code,
                                      },
                                    },
                                    in: {
                                      data: {
                                        type_id: containTypeLinkId,
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
                  {
                    type_id: containTypeLinkId,
                    from_id: packageId,
                  }
                ],
              },
            },
          },
        }
      ,
      {
        type_id: containTypeLinkId,
        from_id: packageId,
      }
      ],
    },
  };
  console.log(JSON.stringify({insertData},null,2))
return await deep.insert(
    insertData,
    {
      name: 'INSERT_HANDLE_ROUTE_HIERARCHICAL',
    }
  )
}

