import { Publisher } from '@team_seki/pubsub-streamer-plugin';
import secrets from '../config/secrets';
import { Users } from '@iam/models';

const TOPIC_AUTHENTICATIONS_SUCCESSFUL = 'gl.iam.authentications.successful.v1';
const TOPIC_AUTHENTICATIONS_FAILED = 'gl.iam.authentications.failed.v1';
const TOPIC_VERSION = 'v1';

class PublisherClient {
    
  /**
   * Publish into queue a sucessful attempt for authentication
   * @param client_id Application id
   * @param provider IAM Provider
   * @param payload payload for signed token
   */
  async authenticationSuccessful(
    client_id: string,
    provider: string,
    user: Users.User.TModel,
    ephemeral_token: string
  ) {
    await new Publisher({
      topic: TOPIC_AUTHENTICATIONS_SUCCESSFUL,
    }).publish(
      {
        client_id,
        provider,
        user,
        ephemeral_token
      },
      {
        content_type: 'application/json',
        source: secrets.PRODUCT_NAME,
        topic: TOPIC_AUTHENTICATIONS_SUCCESSFUL,
        version: TOPIC_VERSION,
      }
    );
  }

  /**
   * Publish into queue a failed attempt for authentication
   * @param client_id Application id
   * @param provider IAM Provider
   * @param reason_code reason code for the failed attempt
   * @param payload payload for signed token
   */
  async authenticationFailed(
    client_id: string,
    provider: string,
    reason_code: 'USER_NOT_REGISTERED_IN_APP',
    user: Users.User.TModel,
    ephemeral_token: string
  ) {
    // --[ Authentication Failed
    //     Publish to queue for later use
    await new Publisher({
      topic: TOPIC_AUTHENTICATIONS_FAILED,
    }).publish(
      {
        client_id,
        provider,
        user,
        reason: reason_code,
        ephemeral_token
      },
      {
        content_type: 'application/json',
        source: secrets.PRODUCT_NAME,
        topic: TOPIC_AUTHENTICATIONS_FAILED,
        version: TOPIC_VERSION,
      }
    );
  }
}

export default new PublisherClient();
