import { SetMetadata } from '@nestjs/common';

export const IS_CUSTOMER_ACCESSIBLE_KEY = 'isCustomerAccessible';
export const CustomerAccessible = () => SetMetadata(IS_CUSTOMER_ACCESSIBLE_KEY, true);
