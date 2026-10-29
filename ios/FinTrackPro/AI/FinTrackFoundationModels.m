#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(FinTrackFoundationModels, NSObject)
RCT_EXTERN_METHOD(getAvailability:(NSString *)locale
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(parseTransaction:(NSDictionary *)input
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
