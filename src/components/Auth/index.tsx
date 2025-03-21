import { Button } from '@payloadcms/ui'
import { signin } from 'payload-auth-plugin/client'

export const AuthComponent = () => {
  ;<Button onClick={() => signin('google')} type="button">
    Sign in with Google
  </Button>
}
