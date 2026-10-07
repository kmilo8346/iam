
export interface IOptions {
  paths: {
    /**
       * SAML Certificate Path
       */
    certificate: string;

    /**
     * XML Definition Path for SAML
     */
    samlDefintion: string;

    /**
     * Private key for signing SAML requests
     */
    privateKey: string;
  }

}