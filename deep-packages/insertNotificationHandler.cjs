exports.insertNotificationHandler = async ({deep, packageId,notificationPort, notificationRoute, portTypeLinkId, routerListeningTypeLinkId, routerTypeLinkId, routerStringUseTypeLinkId, routeTypeLinkId, handleRouteTypeLinkId, handlerTypeLinkId, supportsId, containTypeLinkId,  adminId, fileTypeLinkId, handlerName, code}) => {
return await deep.insert(
    {
      type_id: portTypeLinkId,
      number: {
        data: { value: notificationPort },
      },
      in: {
        data: [
          {
            type_id: routerListeningTypeLinkId,
            from: {
              data: {
                type_id: routerTypeLinkId,
                in: [
                  {
                    data: {
                      type_id: routerStringUseTypeLinkId,
                      string: {
                        data: {
                          value:
                            notificationRoute,
                        },
                      },
                      from: {
                        data: {
                          type_id: routeTypeLinkId,
                          out: {
                            data: {
                              type_id: handleRouteTypeLinkId,
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
                      in: {
                        data: [
                          {
                            type_id: containTypeLinkId,
                            from_id: packageId,
                          },
                        ]
                      }
                    },
                  },
                  {
                    type_id: containTypeLinkId,
                    from_id: packageId,
                  },
                ],
              },
            },
            in : {
              data: {
                type_id: containTypeLinkId,
                from_id: packageId,
              },
            }
          },
          {
            type_id: containTypeLinkId,
            from_id: packageId,
          },
        ],
      },
    },
    {
      name: 'INSERT_HANDLE_ROUTE_HIERARCHICAL',
    }
  )
}

